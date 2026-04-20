package com.pidoo.app;

import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Light theme: fondo claro con iconos oscuros en status bar / nav bar
        getWindow().setStatusBarColor(0xFFFAFAF7);
        getWindow().setNavigationBarColor(0xFFFAFAF7);

        WindowInsetsControllerCompat controller =
            new WindowInsetsControllerCompat(getWindow(), getWindow().getDecorView());
        controller.setAppearanceLightStatusBars(true);
        controller.setAppearanceLightNavigationBars(true);

        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        View content = findViewById(android.R.id.content);
        content.setBackgroundColor(0xFFFAFAF7);
    }
}
