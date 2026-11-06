/** Confere fronteiras de blocos e segredos sobrepostos sem gravar credenciais. */
import{expect,test}from'bun:test';
import{SecretRedactor}from'../src/core/redactor';
test('segredo dividido entre blocos não vaza',()=>{const redact=new SecretRedactor(['token-123']);const result=redact.push('before token-')+redact.push('123 after')+redact.flush();expect(result).toBe('before [SEGREDO] after');});
test('prioriza segredo maior e preserva texto normal',()=>{const redact=new SecretRedactor(['abc','abcdef','']);expect(redact.push('abcdef abc normal')+redact.flush()).toBe('[SEGREDO] [SEGREDO] normal');});
test('todas as posições de corte preservam filtragem',()=>{const text='prefix secret-value suffix';for(let cut=0;cut<=text.length;cut++){const redact=new SecretRedactor(['secret-value']);expect(redact.push(text.slice(0,cut))+redact.push(text.slice(cut))+redact.flush()).toBe('prefix [SEGREDO] suffix');}});
