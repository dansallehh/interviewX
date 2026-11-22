CREATE TABLE customers (
  customer_id INTEGER PRIMARY KEY,
  full_name TEXT NOT NULL,
  tier TEXT NOT NULL,
  region TEXT NOT NULL
);

CREATE TABLE orders (
  order_id INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL,
  status TEXT NOT NULL,
  total_amount NUMERIC NOT NULL,
  order_date TEXT NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
);

INSERT INTO customers (customer_id, full_name, tier, region) VALUES
  (1, 'Amina Yusof', 'Enterprise', 'MY'),
  (2, 'Wei Jie Lim', 'Growth', 'SG'),
  (3, 'Priya Nair', 'Enterprise', 'MY'),
  (4, 'Marcus Chen', 'Starter', 'SG'),
  (5, 'Hana Sofea', 'Growth', 'MY');

INSERT INTO orders (order_id, customer_id, status, total_amount, order_date) VALUES
  (101, 1, 'PAID', 1200, '2026-01-10'),
  (102, 1, 'PAID', 1800, '2026-01-22'),
  (103, 2, 'PAID', 650, '2026-02-01'),
  (104, 2, 'CANCELLED', 900, '2026-02-04'),
  (105, 3, 'PAID', 2400, '2026-02-11'),
  (106, 3, 'PENDING', 1500, '2026-02-15'),
  (107, 4, 'PAID', 300, '2026-02-18'),
  (108, 1, 'REFUNDED', 500, '2026-02-20');
