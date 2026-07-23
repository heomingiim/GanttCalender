@Mapper
public interface UserMapper {
    User findById(Long id);
    User findByEmployeeNumber(String employeeNumber);
    List<User> findByDepartmentId(Long departmentId);
    void insert(User user);
    void update(User user);
    int count();
}