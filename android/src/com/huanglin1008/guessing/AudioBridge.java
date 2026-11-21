package com.huanglin1008.guessing;

import android.content.Context;
import android.content.res.AssetFileDescriptor;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.webkit.JavascriptInterface;

/** Plays only the bundled, licensed music files. */
public final class AudioBridge {
    private final Context context;
    private MediaPlayer player;
    public AudioBridge(Context context) { this.context=context.getApplicationContext(); }
    @JavascriptInterface public synchronized String playTrack(String track,int volume) {
        stop();if("off".equals(track))return "ok";
        final String name="overworld".equals(track)?"overworld.mp3":"happy".equals(track)?"happy-loop.mp3":null;
        if(name==null)return "error";
        try(AssetFileDescriptor asset=context.getAssets().openFd("assets/music/"+name)) {
            player=new MediaPlayer();player.setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_GAME).setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build());
            player.setDataSource(asset.getFileDescriptor(),asset.getStartOffset(),asset.getLength());player.setLooping(true);player.prepare();setVolume(volume);player.start();return "ok";
        } catch(Exception e){stop();return "error";}
    }
    @JavascriptInterface public synchronized void setVolume(int volume){if(player!=null){float v=Math.max(0,Math.min(100,volume))/100f;player.setVolume(v,v);}}
    @JavascriptInterface public synchronized void stop(){if(player!=null){player.release();player=null;}}
}
