package com.example.demo.model;

import lombok.Getter;

@Getter
public enum EVideoResolution {
    P240(240),
    P360(360),
    P480(480),
    P720(720),
    P1080(1080);

    private final int value;

    EVideoResolution(int value) {
        this.value = value;
    }

}
