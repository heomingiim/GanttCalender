package com.durian.groupware;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;

@SpringBootApplication
public class GroupwareApplication {

	public static void main(String[] args) {
		SpringApplication.run(GroupwareApplication.class, args);
	}

	@EventListener(ApplicationReadyEvent.class)
	public void onReady() {
		System.out.println("\n======================================");
		System.out.println("  Server is ready! http://localhost:8080");
		System.out.println("======================================\n");
	}

}
