/** Usa apenas sockets iniciados pelo teste e fecha todos os listeners. */
import{expect,test}from'bun:test';
import{createServer,type AddressInfo}from'node:net';
import{checkLocalPort}from'../src/core/ports';
test("porta in use é recusada e fica available após fechamento",async()=>{
 const server=createServer();await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});const port=(server.address() as AddressInfo).port;
 try{expect(await checkLocalPort(port)).toBe(false);}finally{await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));}
 expect(await checkLocalPort(port)).toBe(true);
});
test('portas fora do intervalo são recusadas',async()=>{await expect(checkLocalPort(22)).rejects.toThrow(new RegExp("invalid","i"));await expect(checkLocalPort(65536)).rejects.toThrow(new RegExp("invalid","i"));});
