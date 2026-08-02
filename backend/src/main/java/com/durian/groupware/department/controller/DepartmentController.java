package com.durian.groupware.department.controller;

import com.durian.groupware.department.dto.DepartmentTreeResponse;
import com.durian.groupware.department.service.DepartmentService;
import com.durian.groupware.user.dto.UserSummaryResponse;
import com.durian.groupware.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/departments")
@RequiredArgsConstructor
public class DepartmentController {

    private final DepartmentService departmentService;
    private final UserService userService;

    // GET /api/departments/tree
    @GetMapping("/tree")
    public List<DepartmentTreeResponse> getTree() {
        return departmentService.getTree();
    }

    // GET /api/departments/{id}/users
    @GetMapping("/{id}/users")
    public List<UserSummaryResponse> getUsersByDept(@PathVariable Long id) {
        return userService.findByDepartmentId(id);
    }
}
