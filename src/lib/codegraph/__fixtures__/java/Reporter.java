package com.example.app;

import java.util.List;

import com.example.app.Util;

public class Reporter implements Formatter {
    private int count = 0;

    public Reporter() {
        this.count = 0;
    }

    @Override
    public String report(String message) {
        this.count += 1;
        return Util.normalize(message);
    }

    public String format(String message) {
        return message.trim();
    }
}
