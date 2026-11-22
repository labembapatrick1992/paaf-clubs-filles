package org.paaf.clubsfilles;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.webkit.WebViewAssetLoader;

/**
 * Affiche le tableau de bord (assets/index.html) dans une WebView.
 * Les fichiers sont servis à l'adresse https://appassets.androidplatform.net/assets/
 * pour que le navigateur intégré autorise le déchiffrement (WebCrypto).
 */
public class MainActivity extends Activity {

    private static final String ACCUEIL = "https://appassets.androidplatform.net/assets/index.html";
    private WebView web;

    @Override
    protected void onCreate(Bundle etatSauve) {
        super.onCreate(etatSauve);

        final WebViewAssetLoader chargeur = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        web = new WebView(this);
        WebSettings reglages = web.getSettings();
        reglages.setJavaScriptEnabled(true);
        reglages.setDomStorageEnabled(true);
        reglages.setAllowFileAccess(false);
        reglages.setAllowContentAccess(false);

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView vue, WebResourceRequest requete) {
                return chargeur.shouldInterceptRequest(requete.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView vue, WebResourceRequest requete) {
                Uri adresse = requete.getUrl();
                if ("appassets.androidplatform.net".equals(adresse.getHost())) {
                    return false;
                }
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, adresse));
                } catch (Exception ignoree) {
                    // aucun navigateur disponible
                }
                return true;
            }
        });

        setContentView(web);
        if (etatSauve != null) {
            web.restoreState(etatSauve);
        } else {
            web.loadUrl(ACCUEIL);
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle sortie) {
        super.onSaveInstanceState(sortie);
        web.saveState(sortie);
    }

    @Override
    public void onBackPressed() {
        if (web.canGoBack()) {
            web.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
