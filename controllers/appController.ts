import { getRoleById } from '../models/role';
import type { RouteMatch } from '../models/router';
import { ErrorBoundaryService } from '../services/errorBoundaryService';
import { clearAllLocalData } from '../services/privacyService';
import { RouterService } from '../services/routerService';
import { ThemeService } from '../services/themeService';
import { renderBriefView, renderLevelPickerView } from '../views/briefView';
import { showErrorOverlay } from '../views/errorOverlayView';
import { renderNotFoundView, renderPlaceholderView } from '../views/notFoundView';
import { renderRoleSelectorView } from '../views/roleSelectorView';
import { renderShell, updateThemeButton, type ShellRefs } from '../views/shellView';

export class AppController {
  private router = new RouterService();
  private theme = new ThemeService();
  private errorBoundary = new ErrorBoundaryService();
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
      this.renderRoute(route);
    });

    this.router.start();
  }

  destroy(): void {
    this.unsubscribeRoute?.();
    this.unsubscribeTheme?.();
    this.router.stop();
    this.errorBoundary.uninstall();
  }

  private renderRoute(route: RouteMatch): void {
    if (!this.shell) return;
    const outlet = this.shell.mainOutlet;

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
        renderBriefView(outlet, role, route.levelId, {
          onBackToLevels: () => this.router.navigate(`#/role/${role.id}`),
          onStartAssessment: (level, multiplier) => {
            const sessionId = `${role.id}-${level.id}-${Date.now().toString(36)}`;
            if (this.shell) {
              this.shell.liveRegion.textContent = `Prepared ${role.name} (${level.label}) session with ${multiplier}x timer.`;
            }
            this.router.navigate(`#/assess/${sessionId}`);
          },
        });
        break;
      }

      case 'assess': {
        document.title = 'Assessment Workspace · InterviewX';
        renderPlaceholderView(
          outlet,
          'Phase 2–3 · Assessment Workspace',
          'Assessment runner ready for Phase 2 engine.',
          `Session "${route.sessionId}" initialized via hash router. Weighted question bank, timer, and interactive runners will be connected in Phase 2 and Phase 3.`,
          () => this.router.navigate('#/'),
        );
        break;
      }

      case 'report': {
        document.title = 'Assessment Report · InterviewX';
        renderPlaceholderView(
          outlet,
          'Phase 3 · Readiness Report',
          'Competency report & export coming in Phase 3.',
          `Report route for session "${route.sessionId}" is wired and ready for scoring, SVG radar chart, PDF/JSON export, and signed share codes.`,
          () => this.router.navigate('#/'),
        );
        break;
      }

      case 'interviewer': {
        document.title = 'Interviewer Mode · InterviewX';
        renderPlaceholderView(
          outlet,
          'Phase 4 · Interviewer Mode',
          'Live supervision & rubric panel coming in Phase 4.',
          'Interviewer Mode will provide PIN-gated live rubric scoring, candidate vs. reference comparison, and structured session exports.',
          () => this.router.navigate('#/'),
        );
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
}
