export const formatExpression = (expr: string) => {
    return expr
      .replace(/\\(.+?)\{(.+?)\}/g, "$2")
      .replace(/=/g, " = ")
      .replace(/\+/g, " + ")
      .replace(/\-/g, " - ")
      .replace(/\*/g, " × ")
      .replace(/\//g, " ÷ ");
  };