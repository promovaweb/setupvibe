/** Prepara unidade de teste e opções exclusivas do Docker aninhado antes de iniciar systemd como PID 1. */
import {mkdirSync,writeFileSync,symlinkSync} from 'node:fs';
mkdirSync('/etc/systemd/system/multi-user.target.wants',{recursive:true});
writeFileSync('/etc/systemd/system/setupvibe-engine-test.service','[Unit]\nAfter=network.target\n[Service]\nType=oneshot\nExecStart=/usr/local/bin/test-bun /root/verify.mjs\nTimeoutStartSec=230\nStandardOutput=journal+console\nStandardError=journal+console\n[Install]\nWantedBy=multi-user.target\n');
symlinkSync('/etc/systemd/system/setupvibe-engine-test.service','/etc/systemd/system/multi-user.target.wants/setupvibe-engine-test.service');
// Esses parâmetros pertencem somente ao contêiner: não são aplicados pelo produto no host.
mkdirSync('/etc/systemd/system/docker.service.d',{recursive:true});
writeFileSync('/etc/systemd/system/docker.service.d/fixture.conf','[Service]\nExecStart=\nExecStart=/usr/sbin/dockerd --storage-driver=vfs --bridge=none --iptables=false --ip6tables=false --ip-forward=false --ip-masq=false --containerd=/run/containerd/containerd.sock\n');
