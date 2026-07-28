public record LoginUser(
    Long id,
    String employeeNumber,
    String name,
    String role,
    Long departmentId
) implements java.io.Serializable {}