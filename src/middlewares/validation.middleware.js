const { body } = require("express-validator");

exports.validateCreateOrder = [
  body("customer_id")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Customer ID must be a non-empty string (Asgardeo sub or email)"),
  body("customer_name")
    .trim()
    .notEmpty()
    .withMessage("Customer name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Customer name must be between 2 and 100 characters"),
  body("customer_email")
    .trim()
    .notEmpty()
    .withMessage("Customer email is required")
    .isEmail()
    .withMessage("Valid email is required"),
  body("customer_phone")
    .optional()
    .trim()
    .matches(/^[\d\s\+\-\(\)]+$/)
    .withMessage("Invalid phone number format"),
  body("shipping_address")
    .trim()
    .notEmpty()
    .withMessage("Shipping address is required")
    .isLength({ min: 10, max: 500 })
    .withMessage("Shipping address must be between 10 and 500 characters"),
  body("items")
    .isArray({ min: 1 })
    .withMessage("Order must contain at least one item"),
  body("items.*.product_id")
    .isInt()
    .withMessage("Product ID must be an integer"),
  body("items.*.quantity")
    .isInt({ min: 1 })
    .withMessage("Quantity must be at least 1"),
  body("items.*.unit_price")
    .isFloat({ min: 0 })
    .withMessage("Unit price must be a positive number"),
  body("notes").optional().trim().isLength({ max: 1000 }),
];

exports.validateUpdateOrder = [
  body("status")
    .optional()
    .isIn(["pending", "processing", "shipped", "delivered", "cancelled"])
    .withMessage("Invalid status value"),
  body("shipping_address")
    .optional()
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage("Shipping address must be between 10 and 500 characters"),
  body("notes").optional().trim().isLength({ max: 1000 }),
];

exports.validateUpdateStatus = [
  body("status")
    .notEmpty()
    .withMessage("Status is required")
    .isIn(["pending", "processing", "shipped", "delivered", "cancelled"])
    .withMessage("Invalid status value"),
];
