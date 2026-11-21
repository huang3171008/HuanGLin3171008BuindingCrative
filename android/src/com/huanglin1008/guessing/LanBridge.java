package com.huanglin1008.guessing;

import android.webkit.JavascriptInterface;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.*;

/** Temporary, local-network-only exchange of WebRTC connection descriptions. */
public final class LanBridge {
    private ServerSocket listener;
    private volatile String answer = "";
    private String secret = "";
    private volatile boolean running;
    private static final int MAX_LINE = 22000;
    private static String json(String key, String value) { return "{\""+key+"\":\""+value.replace("\\","\\\\").replace("\"","\\\"").replace("\n","\\n").replace("\r","\\r")+"\"}"; }
    private static String readLine(BufferedReader in) throws IOException { StringBuilder s=new StringBuilder(); for(int c;(c=in.read())!=-1;){if(c=='\n')return s.toString();if(c!='\r')s.append((char)c);if(s.length()>MAX_LINE)throw new IOException("数据过长");}throw new EOFException(); }
    private static String privateIp() throws SocketException {
        String fallback=null;Enumeration<NetworkInterface> list=NetworkInterface.getNetworkInterfaces();
        while(list.hasMoreElements()){NetworkInterface n=list.nextElement();String name=n.getName().toLowerCase(Locale.ROOT);if(!n.isUp()||n.isLoopback()||name.startsWith("tun")||name.startsWith("rmnet")||name.startsWith("pdp"))continue;
            Enumeration<InetAddress> addresses=n.getInetAddresses();while(addresses.hasMoreElements()){InetAddress a=addresses.nextElement();if(!(a instanceof Inet4Address)||!a.isSiteLocalAddress())continue;String ip=a.getHostAddress();if(name.contains("wlan")||name.contains("wifi")||name.startsWith("ap")||name.contains("swlan"))return ip;if(fallback==null)fallback=ip;}}
        return fallback;
    }
    @JavascriptInterface public synchronized String startHost(String offer) {
        stop();try{if(offer==null||!offer.startsWith("GUESS1.")||offer.length()>MAX_LINE-64)throw new IOException("连接信息无效");String ip=privateIp();if(ip==null)throw new IOException("未找到局域网地址，请先连接 Wi-Fi 或开启热点");
            listener=new ServerSocket();listener.setReuseAddress(true);listener.bind(new InetSocketAddress(0));byte[] rnd=new byte[8];new SecureRandom().nextBytes(rnd);StringBuilder key=new StringBuilder();for(byte b:rnd)key.append(String.format(Locale.ROOT,"%02X",b&255));secret=key.toString();answer="";running=true;
            byte[] addr=InetAddress.getByName(ip).getAddress();StringBuilder hex=new StringBuilder();for(byte b:addr)hex.append(String.format(Locale.ROOT,"%02X",b&255));String code=hex+"-"+String.format(Locale.ROOT,"%04X",listener.getLocalPort())+"-"+secret;
            final ServerSocket owned=listener;final String expected=secret;Thread thread=new Thread(()->serve(owned,expected,offer),"guess-lan");thread.setDaemon(true);thread.start();return json("code",code);
        }catch(Exception e){stop();return json("error",e.getMessage()==null?"无法创建局域网连接":e.getMessage());}
    }
    private void serve(ServerSocket owned,String expected,String offer){while(running&&!owned.isClosed()){try(Socket s=owned.accept()) {s.setSoTimeout(5000);BufferedReader in=new BufferedReader(new InputStreamReader(s.getInputStream(),StandardCharsets.UTF_8));BufferedWriter out=new BufferedWriter(new OutputStreamWriter(s.getOutputStream(),StandardCharsets.UTF_8));String line=readLine(in);String response="ERROR";if(line.equals("GET "+expected))response="OK "+offer;else if(line.startsWith("SET "+expected+" ")){String a=line.substring(("SET "+expected+" ").length());if(a.startsWith("GUESS1.")&&answer.isEmpty()){answer=a;response="OK";}}out.write(response);out.write('\n');out.flush();}catch(IOException ignored){}}}
    private static String exchange(String code,String operation,String body)throws IOException{String c=code==null?"":code.trim().toUpperCase(Locale.ROOT);if(!c.matches("[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{16}"))throw new IOException("连接码格式不正确");String[] parts=c.split("-");long bits=Long.parseLong(parts[0],16);byte[] ip={(byte)(bits>>24),(byte)(bits>>16),(byte)(bits>>8),(byte)bits};InetAddress target=InetAddress.getByAddress(ip);if(!target.isSiteLocalAddress())throw new IOException("连接码不是局域网地址");int port=Integer.parseInt(parts[1],16);if(port<1)throw new IOException("连接码端口无效");if(body!=null&&(!body.startsWith("GUESS1.")||body.length()>MAX_LINE-64))throw new IOException("连接信息无效");try(Socket s=new Socket()){s.connect(new InetSocketAddress(target,port),5000);s.setSoTimeout(5000);BufferedWriter out=new BufferedWriter(new OutputStreamWriter(s.getOutputStream(),StandardCharsets.UTF_8));BufferedReader in=new BufferedReader(new InputStreamReader(s.getInputStream(),StandardCharsets.UTF_8));out.write(operation+" "+parts[2]+(body==null?"":" "+body)+"\n");out.flush();String line=readLine(in);if(!line.startsWith("OK"))throw new IOException("连接码无效或房间已关闭");return line.length()>3?line.substring(3):"";}}
    @JavascriptInterface public String getOffer(String code){try{return json("offer",exchange(code,"GET",null));}catch(Exception e){return json("error","无法连接房主，请检查同一 Wi-Fi、热点及连接码");}}
    @JavascriptInterface public String sendAnswer(String code,String value){try{exchange(code,"SET",value);return "{}";}catch(Exception e){return json("error","发送回复失败，请重新连接");}}
    @JavascriptInterface public String getAnswer(){return answer;}
    @JavascriptInterface public synchronized void stop(){running=false;if(listener!=null){try{listener.close();}catch(IOException ignored){}listener=null;}answer="";secret="";}
}
