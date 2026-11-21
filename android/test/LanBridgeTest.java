package com.huanglin1008.guessing;
public final class LanBridgeTest {
 public static void main(String[] args) throws Exception {
  LanBridge bridge=new LanBridge();LanBridge guest=new LanBridge();String result=bridge.startHost("GUESS2.testoffer");
  if(!result.startsWith("{\"code\":\""))throw new AssertionError(result);
  String code=result.substring(9,result.length()-2);try {
   if(!guest.getOffer(code).contains("GUESS2.testoffer"))throw new AssertionError("offer exchange failed");
   if(!guest.sendAnswer(code,"GUESS2.testanswer").equals("{}"))throw new AssertionError("answer exchange failed");
   if(!bridge.getAnswer().equals("GUESS2.testanswer"))throw new AssertionError("answer mismatch");
   String bad=code.substring(0,code.length()-1)+(code.endsWith("A")?"B":"A");
   if(!guest.getOffer(bad).contains("error"))throw new AssertionError("bad code accepted");
   System.out.println("局域网连接码交换和错误码拒绝测试通过。");
  }finally{bridge.stop();}
 }
}


