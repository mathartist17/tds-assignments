SELECT AVG(quantity * unit_price) AS average_order_value
FROM orders
WHERE LOWER(status) = 'shipped';
