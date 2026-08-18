package com.durian.groupware.stats.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class StatRow {
    private String period;  
    private String status;   // TODO / IN_PROGRESS / DONE / CANCELLED
    private long count;
}
