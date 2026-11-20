# Orca sur un serveur SetupVibe

> Optionnel. SetupVibe n'installe pas Orca ; ce guide décrit une manière testée de l'exécuter sur un serveur préparé par l'édition Server.

[Orca](https://www.onorca.dev) exécute des agents de code dans des worktrees et des terminaux qui vivent sur un serveur. Vous ouvrez l'application de bureau ou Orca Mobile et vous vous connectez à ce serveur, donc fermer l'ordinateur portable n'arrête pas les agents. Ce guide couvre le côté serveur Linux et la manière de l'atteindre en privé par Tailscale.

## Disponibilité

| Édition | Systèmes | État |
| --- | --- | --- |
| Desktop | macOS, Linux et WSL | Non installé |
| Server | Distributions Linux compatibles | Non installé |
| Windows (Beta) | Windows natif | Non installé |

Les étapes ci-dessous ont été testées sur Debian 13 (amd64) avec Orca 1.4.247. Les autres distributions, ARM et le serveur dans un conteneur n'ont pas été testés. Les serveurs distants d'Orca sont une fonctionnalité bêta, alors consultez la [documentation d'Orca](https://www.onorca.dev/docs/remote-servers) si une commande se comporte autrement.

## Avant de commencer

- Exécutez d'abord l'édition Server. Elle installe Tailscale, Docker et les CLI d'IA utilisées dans ce guide.
- Ajoutez le serveur, votre ordinateur et votre téléphone au même réseau Tailscale.
- Utilisez un utilisateur ordinaire avec `sudo`, pas `root`. Le serveur Orca s'exécute sous cet utilisateur.

## Installer le serveur

Téléchargez le paquet `.deb` de votre architecture depuis la page des [releases d'Orca](https://github.com/stablyai/orca/releases). Le fichier s'appelle `orca-ide_<version>_amd64.deb`.

Vérifiez le fichier avant de l'installer, car le paquet s'exécute avec `sudo`. Chaque release d'Orca publie le SHA-256 de ses fichiers. Affichez la valeur publiée et la valeur du fichier que vous avez téléchargé :

```bash
curl -fsSL https://api.github.com/repos/stablyai/orca/releases/tags/v<version> \
    | jq -r '.assets[] | select(.name == "orca-ide_<version>_amd64.deb") | .digest'
sha256sum orca-ide_<version>_amd64.deb
```

La première commande affiche `sha256:` suivi du hash. Le hash doit être le même dans les deux sorties. S'ils diffèrent, supprimez le fichier et ne l'installez pas.

```bash
sudo apt-get install -y ./orca-ide_<version>_amd64.deb xvfb
orca-ide --version
```

`xvfb` fournit un écran virtuel au serveur sans moniteur. Sous Linux la commande est `orca-ide`, et non `orca`, pour ne pas entrer en conflit avec le lecteur d'écran de GNOME.

## L'exécuter comme service

Activez le lingering pour que le service de l'utilisateur continue de tourner après la fermeture de la session, puis installez le service :

```bash
loginctl enable-linger "$USER"
orca-ide serve service install --port 6768
orca-ide serve service status
```

Le service lance `orca serve --supervise --no-pairing` et le redémarre s'il s'arrête. Le port met environ 20 secondes à s'ouvrir :

```bash
ss -ltn | grep 6768
```

## Garder le port privé

Le serveur écoute sur toutes les interfaces et le signale dans sa propre sortie. Quiconque atteint le port 6768 peut tenter un appairage, alors autorisez-le uniquement par Tailscale.

L'édition Server n'installe et n'active aucun pare-feu. Une règle enregistrée alors que `ufw` est inactif n'a aucun effet, et le port reste ouvert sur Internet. Installez `ufw`, autorisez SSH avant d'activer le pare-feu pour conserver l'accès au serveur, puis autorisez le port d'Orca uniquement sur l'interface Tailscale :

```bash
sudo apt-get install -y ufw
sudo ufw allow OpenSSH
sudo ufw default deny incoming
sudo ufw allow in on tailscale0 to any port 6768 proto tcp
sudo ufw enable
sudo ufw status verbose
```

L'état doit afficher `Status: active`, la valeur par défaut `deny (incoming)` et les deux règles. Si vous accédez au serveur en SSH uniquement par Tailscale, remplacez `sudo ufw allow OpenSSH` par `sudo ufw allow in on tailscale0 to any port 22 proto tcp`.

`ufw default deny incoming` ferme tous les autres ports qui n'ont pas de règle. Créez une règle pour chaque service que cette machine publie sur Internet, comme les ports 80 et 443 d'un serveur web. Les ports publiés par des conteneurs Docker ne passent pas par `ufw`, donc ce changement ne les ferme pas.

Vérifiez depuis deux endroits. Par l'adresse Tailscale le serveur doit répondre, et par l'adresse publique non :

```bash
curl -s -m 6 -o /dev/null -w "%{http_code}\n" http://<ip-tailscale>:6768/
curl -s -m 6 -o /dev/null -w "%{http_code}\n" http://<ip-publique>:6768/
```

La première commande affiche `200`. La seconde expire et affiche `000`. Lancez la seconde depuis une machine qui n'est pas sur votre réseau Tailscale.

## Appairer les applications

Le service n'affiche pas de lien d'appairage. Pour en créer un, arrêtez le service, lancez le serveur au premier plan et copiez la ligne `Pairing URL` :

```bash
systemctl --user stop orca-serve
orca-ide serve --port 6768 --pairing-address <ip-tailscale>
```

Pour le téléphone, ajoutez `--mobile-pairing`. Traitez le lien comme un mot de passe et ne le collez pas dans des discussions ou des issues. Il expire après quelques minutes.

Dans l'application de bureau, ouvrez Settings, puis Remote Orca Servers, choisissez Add Server et collez le lien. Dans Orca Mobile, choisissez Pair et collez-le, avec Tailscale activé. Un appareil appairé conserve son propre jeton, donc un nouvel appairage n'est pas nécessaire après un redémarrage.

Arrêtez le serveur au premier plan avec `Ctrl+C` et relancez le service :

```bash
systemctl --user start orca-serve
```

Appairez tous les appareils avant d'ouvrir des terminaux. Redémarrer le serveur en tuant tous les processus de l'utilisateur ferme aussi les terminaux et les agents qui y tournent. L'historique des conversations reste sur le disque.

## Organiser les projets

Utilisez Add Project sur un dossier du serveur qui contient plusieurs dépôts Git. Orca propose de les importer comme un groupe, qui fonctionne comme un espace nommé dans la barre latérale. Ouvrez un terminal dans chaque dépôt et lancez-y votre agent, pour que les instructions du projet soient trouvées.

## Dépannage

| Symptôme | Vérification |
| --- | --- |
| `orca: command not found` | Utilisez `orca-ide` sous Linux. |
| `claude: command not found` dans un terminal Orca | Le terminal s'est ouvert en `bash`, et le `PATH` est défini dans `.zshrc`. Définissez le shell du service comme décrit ci-dessous. |
| Le port ne s'ouvre pas | Attendez environ 20 secondes, puis lisez `journalctl --user -u orca-serve -n 30`. |
| L'application ne se connecte pas | Confirmez que Tailscale est activé sur les deux appareils et que l'adresse Tailscale répond sur le port 6768. |
| Les terminaux semblent lents | Mesurez d'abord le `ping` vers le serveur. La cause est presque toujours la distance et le chemin réseau entre vous et le serveur, pas Orca. |

### Choisir le shell des terminaux

Orca ouvre les terminaux dans le shell indiqué par la variable `SHELL` du service. Si elle est vide, les terminaux s'ouvrent en `bash`. Pour utiliser `zsh` :

```bash
mkdir -p ~/.config/systemd/user/orca-serve.service.d
printf '[Service]\nEnvironment=SHELL=/usr/bin/zsh\n' > ~/.config/systemd/user/orca-serve.service.d/shell.conf
systemctl --user daemon-reload
systemctl --user restart orca-serve
```

Les terminaux déjà ouverts gardent l'ancien shell jusqu'à leur fermeture.

## Pour aller plus loin

- [Documentation d'Orca](https://www.onorca.dev/docs)
- [Serveurs distants d'Orca](https://www.onorca.dev/docs/remote-servers)
- [Index de la documentation de SetupVibe](../README.md)
