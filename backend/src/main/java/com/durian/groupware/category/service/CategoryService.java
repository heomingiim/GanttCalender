package com.durian.groupware.category.service;

import com.durian.groupware.category.dto.Category;
import com.durian.groupware.category.dto.CategoryRequest;
import com.durian.groupware.category.dto.CategoryResponse;
import com.durian.groupware.category.mapper.CategoryMapper;
import com.durian.groupware.global.auth.LoginUser;
import com.durian.groupware.global.auth.exception.BusinessException;
import com.durian.groupware.global.auth.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service @RequiredArgsConstructor
public class CategoryService {

    private final CategoryMapper categoryMapper;

    public List<CategoryResponse> getMyCategories(LoginUser loginUser) {
        List<Category> personal = categoryMapper.findByUserId(loginUser.id());
        List<Category> team = categoryMapper.findByDepartmentId(loginUser.departmentId());
        // 개인 + 팀 공용 합쳐서 반환
        List<Category> all = new ArrayList<>();
        all.addAll(personal);
        all.addAll(team);
        return all.stream().map(CategoryResponse::from).toList();
    }

    public void create(LoginUser loginUser, CategoryRequest req) {
        Category category = new Category();
        category.setName(req.name());
        category.setColor(req.color());

        if (req.isTeam()) {
            if ("MEMBER".equals(loginUser.role())) {
                throw new BusinessException(ErrorCode.CATEGORY_FORBIDDEN);
            }
            category.setDepartmentId(loginUser.departmentId());
        } else {
            category.setUserId(loginUser.id());
        }
        categoryMapper.insert(category);
    }

    public void update(LoginUser loginUser, Long id, CategoryRequest req) {
        Category category = categoryMapper.findById(id);
        if (category == null) throw new BusinessException(ErrorCode.CATEGORY_NOT_FOUND);

        // 팀 공용이면 팀장급만 수정 가능
        if (category.getDepartmentId() != null && "MEMBER".equals(loginUser.role())) {
            throw new BusinessException(ErrorCode.CATEGORY_FORBIDDEN);
        }
        category.setName(req.name());
        category.setColor(req.color());
        categoryMapper.update(category);
    }

    public void delete(LoginUser loginUser, Long id) {
        Category category = categoryMapper.findById(id);
        if (category == null) throw new BusinessException(ErrorCode.CATEGORY_NOT_FOUND);

        if (category.getDepartmentId() != null && "MEMBER".equals(loginUser.role())) {
            throw new BusinessException(ErrorCode.CATEGORY_FORBIDDEN);
        }
        categoryMapper.delete(id);
    }
}