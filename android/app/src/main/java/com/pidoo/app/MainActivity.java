package com.pidoo.app;

import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.graphics.Insets;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Status bar oscura con iconos blancos
        getWindow().setStatusBarColor(0xFF0D0D0D);
        getWindow().setNavigationBarColor(0xFF0D0D0D);
        getWindow().getDecorView().setSystemUiVisibility(0);

        // Mantener pantalla encendida
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        // Fondo oscuro + padding para que el contenido no se meta detrás de la status bar
        View content = findViewById(android.R.id.content);
        content.setBackgroundColor(0xFF0D0D0D);
        ViewCompat.setOnApplyWindowInsetsListener(content, (view, insets) -> {
            Insets systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            view.setPadding(systemBars.left, systemBars.top, systemBars.right, 0);
            return insets;
        });
    }
}
