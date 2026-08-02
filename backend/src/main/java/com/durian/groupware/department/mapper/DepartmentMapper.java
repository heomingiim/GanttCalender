package com.durian.groupware.department.mapper;

import com.durian.groupware.department.dto.Department;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

@Mapper
public interface DepartmentMapper {
    List<Department> findAll();
    List<Department> findByParentId(Long parentId);
    Department findById(Long id);
    void insert(Department department);  // DataSeeder에서 사용
}
