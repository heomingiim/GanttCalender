package com.durian.groupware.category.mapper;

import com.durian.groupware.category.dto.Category;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

@Mapper
public interface CategoryMapper {
    List<Category> findByUserId(Long userId);
    List<Category> findByDepartmentId(Long departmentId);
    Category findById(Long id);
    void insert(Category category);
    void update(Category category);
    void delete(Long id);
}