@Getter
@Setter
@NoArgsConstructor
public class User {
    private Long id;
    private String employeeNumber;
    private String name;
    private Long departmentId;
    private String role;
    private String positionRank;
    private String email;
    private String phone;
    private LocalDate hireDate;
    private String contractType;
    private boolean active;
    private LocalDate resignedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}