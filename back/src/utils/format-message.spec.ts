import { formatMessage } from "./format-message";

describe("formatMessage", () => {
  it("should replace a single placeholder", () => {
    const template = "Hello, {{name}}!";
    const payload = { name: "World" };
    expect(formatMessage(template, payload)).toBe("Hello, World!");
  });

  it("should replace multiple placeholders", () => {
    const template = "User {{username}} from {{city}}.";
    const payload = { username: "John", city: "New York" };
    expect(formatMessage(template, payload)).toBe("User John from New York.");
  });

  it("should handle placeholders not present in the payload", () => {
    const template = "Hello, {{name}}! Your age is {{age}}.";
    const payload = { name: "World" };
    expect(formatMessage(template, payload)).toBe(
      "Hello, World! Your age is .",
    );
  });

  it("should handle numeric and boolean values in payload", () => {
    const template = "Value: {{val}}, Status: {{active}}";
    const payload = { val: 123, active: true };
    expect(formatMessage(template, payload)).toBe("Value: 123, Status: true");
  });

  it("should return the template string if no placeholders are present", () => {
    const template = "This is a simple string.";
    const payload = { any: "data" };
    expect(formatMessage(template, payload)).toBe("This is a simple string.");
  });

  it("should handle an empty template string", () => {
    const template = "";
    const payload = { name: "Test" };
    expect(formatMessage(template, payload)).toBe("");
  });

  it("should handle an empty payload", () => {
    const template = "Hello, {{name}}!";
    const payload = {};
    expect(formatMessage(template, payload)).toBe("Hello, !");
  });

  it("should ignore object and array values in payload", () => {
    const template = "User: {{user}}, Roles: {{roles}}";
    const payload = { user: { id: 1 }, roles: ["admin", "user"] };
    expect(formatMessage(template, payload)).toBe("User: , Roles: ");
  });

  it("should handle extra whitespace in placeholders", () => {
    const template = "Hello, {{ name }}!";
    const payload = { name: "Spaced" };
    expect(formatMessage(template, payload)).toBe("Hello, Spaced!");
  });
});
