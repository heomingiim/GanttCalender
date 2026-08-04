package com.durian.groupware.category.controller;

import com.durian.groupware.category.dto.CategoryRequest;
import com.durian.groupware.category.dto.CategoryResponse;
import com.durian.groupware.category.service.CategoryService;
import com.durian.groupware.global.auth.Login;
import com.durian.groupware.global.auth.LoginUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;

    // GET /api/categories — 내 카테고리 + 팀 공용 카테고리
    @GetMapping
    public List<CategoryResponse> getMyCategories(@Login LoginUser loginUser) {
        return categoryService.getMyCategories(loginUser);
    }

    // POST /api/categories
    @PostMapping
    public ResponseEntity<Void> create(@Login LoginUser loginUser,
                                       @Valid @RequestBody CategoryRequest req) {
        categoryService.create(loginUser, req);
        return ResponseEntity.ok().build();
    }

    // PUT /api/categories/{id}
    @PutMapping("/{id}")
    public ResponseEntity<Void> update(@Login LoginUser loginUser,
                                       @PathVariable Long id,
                                       @Valid @RequestBody CategoryRequest req) {
        categoryService.update(loginUser, id, req);
        return ResponseEntity.ok().build();
    }

    // DELETE /api/categories/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@Login LoginUser loginUser,
                                       @PathVariable Long id) {
        categoryService.delete(loginUser, id);
        return ResponseEntity.ok().build();
    }
}
