const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('LanBridge',{
 startHost:offer=>ipcRenderer.invoke('lan:startHost',offer),
 getOffer:code=>ipcRenderer.invoke('lan:getOffer',code),
 sendAnswer:(code,answer)=>ipcRenderer.invoke('lan:sendAnswer',code,answer),
 getAnswer:()=>ipcRenderer.invoke('lan:getAnswer'),
 stop:()=>ipcRenderer.invoke('lan:stop')
});
