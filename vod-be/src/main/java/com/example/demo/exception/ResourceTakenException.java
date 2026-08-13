package com.example.demo.exception;


public class ResourceTakenException extends IllegalArgumentException {
    public ResourceTakenException(String message) {
        super(message);
    }
}
