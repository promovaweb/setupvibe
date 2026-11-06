# Ambiente descartável para homologar o user manager e o coletor compilado.
FROM debian@sha256:62bd423aeee912639ca8ee681c2b762cb3e25137e0a92b20be455898a9f034ad
ENV container=docker
RUN apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
       systemd systemd-sysv dbus-user-session libpam-systemd \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --uid 1000 --create-home --shell /bin/bash tester
STOPSIGNAL SIGRTMIN+3
CMD ["/sbin/init"]
