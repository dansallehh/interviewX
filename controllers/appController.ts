import type { Question } from '../models/question';
import type { AssessmentReport } from '../models/report';
import { getRoleById } from '../models/role';
import type { RouteMatch } from '../models/router';
import { createAssessmentSession } from '../services/assessmentEngineService';
import { ErrorBoundaryService } from '../services/errorBoundaryService';
import { clearAllLocalData } from '../services/privacyService';
import { loadQuestionBank } from '../services/questionBankService';
import { RouterService } from '../services/routerService';
import { scoreAssessmentSession } from '../services/scoringService';
import { StorageService } from '../services/storageService';
import { TabSyncService } from '../services/tabSyncService';
import { ThemeService } from '../services/themeService';
import { TimerService } from '../services/timerService';
import { renderAssessmentView } from '../views/assessmentView';
import { renderBriefView, renderLevelPickerView } from '../views/briefView';
import { showErrorOverlay } from '../views/errorOverlayView';
import { renderInterviewerView, type InterviewerState } from '../views/interviewerView';
import { renderNotFoundView } from '../views/notFoundView';
import { renderReportView } from '../views/reportView';
import type { RoleSceneHandle } from '../views/roleSceneView';
import { renderRoleSelectorSkeleton, renderRoleSelectorView } from '../views/roleSelectorView';
import { renderShell, updateThemeButton, type ShellRefs } from '../views/shellView';

export class AppController {
  private router = new RouterService();
  private theme = new ThemeService();
  private errorBoundary = new ErrorBoundaryService();
  private storage = new StorageService();
  private tabSync = new TabSyncService();
  private activeTimer: TimerService | null = null;
  private activeScene: RoleSceneHandle | null = null;
  private interviewerState: InterviewerState = {
    unlocked: false,
    selectedRoleId: 'dba',
    rubricChecks: {},
    notes: {},
  };
  private unsubscribeConflict: (() => void) | null = null;
  private shell: ShellRefs | null = null;
  private unsubscribeRoute: (() => void) | null = null;
  private unsubscribeTheme: (() => void) | null = null;

  mount(rootContainer: HTMLElement): void {
    this.errorBoundary.install((entry) => {
      showErrorOverlay(entry, this.errorBoundary);
    });

    const initialTheme = this.theme.init();
    this.shell = renderShell(rootContainer, initialTheme, {
      onNavigate: (hash) => this.router.navigate(hash),
      onToggleTheme: () => {
        const next = this.theme.toggle();
        if (this.shell) {
          updateThemeButton(this.shell.themeButton, next);
          this.shell.liveRegion.textContent = `Theme switched to ${next} mode.`;
        }
      },
      onClearAllData: async () => {
        this.teardownActiveAssessment();
        await clearAllLocalData();
        this.router.navigate('#/');
      },
    });

    this.unsubscribeTheme = this.theme.subscribe((mode) => {
      if (this.shell) {
        updateThemeButton(this.shell.themeButton, mode);
      }
    });

    this.unsubscribeRoute = this.router.subscribe((route) => {
      void this.renderRoute(route);
    });

    this.router.start();
  }

  destroy(): void {
    this.teardownActiveAssessment();
    this.unsubscribeRoute?.();
    this.unsubscribeTheme?.();
    this.router.stop();
    this.errorBoundary.uninstall();
  }

  private teardownActiveAssessment(): void {
    if (this.activeTimer) {
      this.activeTimer.stop();
      this.activeTimer = null;
    }
    this.unsubscribeConflict?.();
    this.unsubscribeConflict = null;
    this.tabSync.release();
  }

  private async renderRoute(route: RouteMatch): Promise<void> {
    if (!this.shell) return;
    const outlet = this.shell.mainOutlet;

    if (this.activeScene) {
      this.activeScene.dispose();
      this.activeScene = null;
    }

    if (route.name !== 'assess') {
      this.teardownActiveAssessment();
    }

    switch (route.name) {
      case 'home': {
        document.title = 'InterviewX · Role-Based Technical Assessment';
        renderRoleSelectorView(outlet, {
          onSelectRole: (roleId) => {
            const role = getRoleById(roleId);
            if (role && role.levels.length > 1) {
              this.router.navigate(`#/role/${roleId}`);
            } else {
              this.router.navigate(`#/brief/${roleId}`);
            }
          },
        });
        break;
      }

      case 'role': {
        const role = getRoleById(route.roleId);
        if (!role) {
          this.router.navigate('#/404');
          return;
        }
        document.title = `${role.name} · Select Level · InterviewX`;
        renderLevelPickerView(outlet, role, {
          onBack: () => this.router.navigate('#/'),
          onSelectLevel: (levelId) => this.router.navigate(`#/brief/${role.id}/${levelId}`),
        });
        break;
      }

      case 'brief': {
        const role = getRoleById(route.roleId);
        if (!role) {
          this.router.navigate('#/404');
          return;
        }
        document.title = `${role.name} Brief · InterviewX`;
        this.activeScene = renderBriefView(outlet, role, route.levelId, {
          onBackToLevels: () => this.router.navigate(`#/role/${role.id}`),
          onStartAssessment: async (level, multiplier, candidateName) => {
            renderRoleSelectorSkeleton(outlet);
            const bank = await loadQuestionBank(role.id);
            const history = await this.storage.loadAttemptHistory(role.id);
            const { session } = createAssessmentSession({
              role,
              levelId: level.id,
              questionPool: bank.questions,
              seenQuestionIds: history.seenQuestionIds,
              candidateName,
              accommodationMultiplier: multiplier,
              tabId: this.tabSync.tabId,
            });
            await this.storage.saveSession(session);
            this.router.navigate(`#/assess/${session.sessionId}`);
          },
        });
        break;
      }

      case 'assess': {
        await this.mountAssessmentRoute(outlet, route.sessionId);
        break;
      }

      case 'report': {
        await this.mountReportRoute(outlet, route.sessionId);
        break;
      }

      case 'interviewer': {
        document.title = 'Interviewer Mode · InterviewX';
        const drawInterviewer = () => {
          renderInterviewerView(outlet, this.interviewerState, (next) => {
            this.interviewerState = next;
            drawInterviewer();
          });
        };
        drawInterviewer();
        break;
      }

      case 'not-found': {
        document.title = '404 Not Found · InterviewX';
        renderNotFoundView(outlet, route.path, () => this.router.navigate('#/'));
        break;
      }
    }

    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  private async mountAssessmentRoute(outlet: HTMLElement, sessionId: string): Promise<void> {
    const { session, corrupted } = await this.storage.loadSession(sessionId);
    if (!session) {
      renderNotFoundView(
        outlet,
        corrupted ? `corrupted session (${sessionId})` : `/assess/${sessionId}`,
        () => this.router.navigate('#/'),
      );
      return;
    }

    if (session.status !== 'in_progress') {
      this.router.navigate(`#/report/${session.sessionId}`);
      return;
    }

    const role = getRoleById(session.roleId);
    if (!role) {
      this.router.navigate('#/404');
      return;
    }

    const bank = await loadQuestionBank(role.id);
    const questionMap = new Map(bank.questions.map((q) => [q.id, q]));
    const questions = session.questionIds
      .map((id) => questionMap.get(id))
      .filter((q): q is Question => Boolean(q));

    if (questions.length === 0) {
      this.router.navigate('#/404');
      return;
    }

    document.title = `${role.name} Assessment · InterviewX`;

    const submitSession = async (expired: boolean) => {
      this.teardownActiveAssessment();
      session.status = expired ? 'expired' : 'submitted';
      session.submittedAt = Date.now();
      await this.storage.saveSession(session);

      const report = await scoreAssessmentSession(role, session, questions);
      await this.storage.saveReport(report);

      const history = await this.storage.loadAttemptHistory(role.id);
      const mergedSeen = Array.from(new Set([...history.seenQuestionIds, ...session.questionIds]));
      await this.storage.saveAttemptHistory({
        roleId: role.id,
        seenQuestionIds: mergedSeen,
        completedSessionIds: Array.from(new Set([...history.completedSessionIds, session.sessionId])),
        updatedAt: new Date().toISOString(),
      });

      this.router.navigate(`#/report/${session.sessionId}`);
    };

    const draw = () => {
      const handle = renderAssessmentView(outlet, role, session, questions, {
        onSelectIndex: (idx) => {
          session.currentIndex = Math.min(Math.max(0, idx), questions.length - 1);
          void this.storage.saveSession(session);
          draw();
        },
        onUpdateResponse: (questionId, response) => {
          const prev = session.responses[questionId];
          session.responses[questionId] = response;
          void this.storage.saveSession(session);
          // Re-render only when discrete selection/hint changes so text editors keep cursor focus
          if (
            prev?.selectedOptionId !== response.selectedOptionId ||
            JSON.stringify(prev?.selectedOptionIds) !== JSON.stringify(response.selectedOptionIds)
          ) {
            draw();
          }
        },
        onSubmit: () => {
          void submitSession(false);
        },
      });

      const status = this.storage.getStatus();
      if (status.degraded && status.warning) {
        handle.showStorageWarning(status.warning);
      }

      if (this.activeTimer) {
        handle.updateTimer(this.activeTimer.getSnapshot());
      }

      this.teardownActiveAssessment();
      this.activeTimer = new TimerService(session.startedAt, session.deadlineAt, {
        onTick: (snap) => handle.updateTimer(snap),
        onWarning: (_threshold, message) => {
          handle.announceWarning(message);
          if (this.shell) this.shell.liveRegion.textContent = message;
        },
        onExpire: () => {
          void submitSession(true);
        },
      });
      this.activeTimer.start(500);

      this.unsubscribeConflict = this.tabSync.onConflict((ev) => {
        handle.showTabConflict(ev.otherTabId);
      });
      this.tabSync.claimSession(session.sessionId);
    };

    draw();
  }

  private async mountReportRoute(outlet: HTMLElement, sessionId: string): Promise<void> {
    const report = await this.storage.loadReport<AssessmentReport>(sessionId);
    if (!report) {
      renderNotFoundView(outlet, `/report/${sessionId}`, () => this.router.navigate('#/'));
      return;
    }

    document.title = `${report.roleName} Report (${report.overallScore}%) · InterviewX`;
    renderReportView(outlet, report, {
      onRetake: () => this.router.navigate(`#/brief/${report.roleId}/${report.levelId}`),
      onGoHome: () => this.router.navigate('#/'),
      onImportValidReport: async (imported) => {
        await this.storage.saveReport(imported);
        if (imported.sessionId !== sessionId) {
          this.router.navigate(`#/report/${imported.sessionId}`);
        }
      },
    });
  }
}
