CREATE TABLE departments (
  dept_id INTEGER PRIMARY KEY,
  dept_name TEXT NOT NULL UNIQUE,
  cost_center TEXT NOT NULL
);

CREATE TABLE employees (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  salary NUMERIC NOT NULL,
  city TEXT NOT NULL
);

INSERT INTO departments (dept_id, dept_name, cost_center) VALUES
  (10, 'Finance', 'CC-100'),
  (20, 'IT', 'CC-200'),
  (30, 'HR', 'CC-300');

INSERT INTO employees (id, name, department, salary, city) VALUES
  (1, 'Aisyah Rahman', 'Finance', 4800, 'Kuala Lumpur'),
  (2, 'Daniel Tan', 'IT', 5200, 'George Town'),
  (3, 'Farah Nadia', 'HR', 3900, 'Ipoh'),
  (4, 'Kavitha Devi', 'Finance', 6100, 'Ipoh'),
  (5, 'Hafizuddin Ali', 'IT', 4600, 'Kuala Lumpur'),
  (6, 'Mei Ling Wong', 'Finance', 5400, 'George Town'),
  (7, 'Suresh Kumar', 'HR', 4200, 'Kuala Lumpur'),
  (8, 'Nurul Huda', 'IT', 5900, 'Ipoh'),
  (9, 'Jason Lim', 'Finance', 4300, 'Ipoh');
