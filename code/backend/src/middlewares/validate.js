function validate(schema, source = "body") {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return res.status(400).json({
        error: "Validation failed",
        issues: result.error.issues.map((issue) => issue.message),
      });
    }
    req[source] = result.data;
    return next();
  };
}

module.exports = { validate };
