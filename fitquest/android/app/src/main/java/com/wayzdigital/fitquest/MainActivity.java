package com.wayzdigital.fitquest;

import android.content.res.Configuration;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.widget.FrameLayout;

import com.getcapacitor.BridgeActivity;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;

public class MainActivity extends BridgeActivity {
    private static final int STATUS_BAR_LIGHT = Color.rgb(248, 250, 252);
    private static final int STATUS_BAR_DARK = Color.rgb(10, 6, 18);

    private View statusBarScrim;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        configureSystemBars();
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);

        configureSystemBars();
    }

    private void configureSystemBars() {
        boolean isDarkTheme = (getResources().getConfiguration().uiMode
            & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES;
        int statusBarColor = isDarkTheme ? STATUS_BAR_DARK : STATUS_BAR_LIGHT;

        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        getWindow().setStatusBarColor(statusBarColor);
        getWindow().setNavigationBarColor(Color.TRANSPARENT);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            getWindow().setStatusBarContrastEnforced(false);
            getWindow().setNavigationBarContrastEnforced(false);
        }

        WindowInsetsControllerCompat controller =
            WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        controller.setAppearanceLightStatusBars(!isDarkTheme);
        controller.setAppearanceLightNavigationBars(false);

        applyStatusBarScrim(statusBarColor);
    }

    private void applyStatusBarScrim(int color) {
        if (statusBarScrim == null) {
            statusBarScrim = new View(this);
            statusBarScrim.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO);
            addContentView(statusBarScrim, createStatusBarScrimLayoutParams());
        } else {
            statusBarScrim.setLayoutParams(createStatusBarScrimLayoutParams());
        }

        statusBarScrim.setBackgroundColor(color);
        statusBarScrim.bringToFront();
    }

    private FrameLayout.LayoutParams createStatusBarScrimLayoutParams() {
        return new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            getStatusBarHeight(),
            Gravity.TOP
        );
    }

    private int getStatusBarHeight() {
        int resourceId = getResources().getIdentifier("status_bar_height", "dimen", "android");
        if (resourceId > 0) {
            return getResources().getDimensionPixelSize(resourceId);
        }

        return 0;
    }
}
