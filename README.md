![Kubernetes](https://camo.githubusercontent.com/9fb8c7cad55c2ac1f2f94927172a2fd43f1ca48993952ac62f87684664309ee1/68747470733a2f2f74656368737461636b2d67656e657261746f722e76657263656c2e6170702f6b756265726e657465732d69636f6e2e737667)

# Aplicație Web cu Chat și Servicii de IA pe Kubernetes

## Obiectivul Proiectului

Obiectivul acestui proiect este dezvoltarea unui website complex care integrează o aplicație de chat și o aplicație de Inteligență Artificială. Implementarea va fi realizată folosind mai multe deployment-uri gestionate de un cluster Kubernetes, asigurând astfel o arhitectură scalabilă și flexibilă.

## Arhitectura Generală

Aplicația este compusă din mai multe componente-cheie:

### 1. Sistemul de Management al Conținutului (CMS)

- **Platforma**: Statamic
- **Replici**: 4
- **Port expus**: 80
- **Funcționalitate**: Oferă interfața principală a site-ului web pentru un magazin online de produse electronice
- **Persistența datelor**: Bază de date dedicată pentru stocarea conținutului site-ului
- **Integrare**: Include iframe-uri pentru componentele de chat și IA

### 2. Sistemul de Chat

#### Backend Chat (WebSocket)
- **Tehnologie**: Node.js cu server WebSocket + Apache
- **Replici**: 4
- **Port expus**: 88
- **Funcționalitate**: Gestionează comunicarea în timp real între utilizatori
- **Persistența datelor**: MongoDB pentru stocarea mesajelor (nume utilizator, mesaj text în format ASCII, timestamp)

#### Frontend Chat
- **Framework**: Angular
- **Replici**: 1
- **Port expus**: 90
- **Funcționalitate**: Interfața utilizator pentru sistemul de chat, care afișează mesajele în ordine cronologică și permite trimiterea de mesaje noi

### 3. Aplicația de Inteligență Artificială

#### Backend IA
- **Funcționalitate**: Procesează fișierele încărcate utilizând serviciul Azure de Speech Translation
- **Persistența datelor**: 
  - Azure Blob Storage pentru stocarea fișierelor
  - Bază de date SQL în Azure pentru metadate (nume fișier, URL blob, timestamp, rezultat procesare)

#### Frontend IA
- **Framework**: Angular
- **Replici**: 1
- **Port expus**: 91
- **Funcționalitate**: Permite încărcarea fișierelor audio și afișează istoricul procesărilor anterioare cu rezultatele obținute

## Structura Proiectului

```
/
├── cms/                      # Configurare Statamic CMS
│   ├── myproject/            # Codul sursă al aplicației CMS
│   ├── docker-compose.yml    # Configurare Docker pentru dezvoltare locală
│
├── chat/                     # Aplicația de Chat
│   ├── frontend/             # Client Angular pentru chat
│   ├── backend/              # Server WebSocket Node.js
│   ├── mongodb/              # Configurare MongoDB
│   ├── apache/               # Configurare server Apache
│   ├── docker-compose.yml    # Configurare Docker pentru dezvoltare locală
│
├── ai/                       # Aplicația de IA
│   ├── frontend/             # Client Angular pentru încărcare și vizualizare
│   ├── backend/              # Server pentru procesarea fișierelor
│   ├── README.md             # Documentație specifică componentei de IA
│   ├── docker-compose.yml    # Configurare Docker pentru dezvoltare locală
│
├── kubernetes/               # Configurări Kubernetes
│   ├── cms/                  # Manifest-uri pentru CMS
│   ├── chat/                 # Manifest-uri pentru Chat
│   ├── ai/                   # Manifest-uri pentru IA
│   ├── common/               # Resurse comune (PersistentVolumes, ConfigMaps, Secrets)
│   └── deploy-all.yaml       # Script pentru implementarea întregii aplicații
│
└── README.md                 # Documentația principală (acest fișier)
```

## Implementare

### Cerințe preliminare

1. Un cluster Kubernetes cu cel puțin două noduri
2. Addon-uri instalate:
   - Registry privat pentru imagini Docker
   - Ingress controller
   - Cert-manager (opțional, pentru HTTPS)
3. Conexiune la Azure pentru serviciile de Speech Translation, SQL Database și Blob Storage
4. Kubectl configurat corect pentru accesarea clusterului

### Pași de Implementare

1. **Pregătirea Clusterului**
   - Asigurați-vă că toate nodurile sunt funcționale: `kubectl get nodes`
   - Verificați că addon-urile necesare sunt instalate și funcționale

2. **Construirea Imaginilor Docker**
   - Construiți toate imaginile Docker necesare pentru componentele personalizate
   - Încărcați imaginile în registry-ul privat al clusterului

3. **Configurarea Secretelor**
   - Creați secretele necesare pentru credențialele Azure și alte date sensibile
   ```bash
   kubectl create secret generic azure-credentials \
     --from-literal=storage-connection-string=<CONNECTION_STRING> \
     --from-literal=sql-connection-string=<SQL_CONNECTION> \
     --from-literal=speech-key=<SPEECH_KEY> \
     --from-literal=speech-region=<SPEECH_REGION>
   ```

4. **Implementarea Aplicației**
   - Aplicați toți manifesturile Kubernetes într-o singură comandă:
   ```bash
   kubectl apply -f kubernetes/deploy-all.yaml
   ```

5. **Verificarea Implementării**
   - Verificați că toate pod-urile rulează corect: `kubectl get pods`
   - Verificați serviciile: `kubectl get services`
   - Accesați aplicația folosind IP-ul extern sau numele DNS configurat

## Observații Importante

1. Toate imaginile Docker personalizate folosesc tehnici de construcție multi-stage pentru a reduce dimensiunea finală.
2. Comunicarea între componente este securizată prin politici de rețea Kubernetes.
3. Persistența datelor este asigurată prin volume persistente pentru bazele de date locale.
4. Pentru serviciile Azure, sunt utilizate credențiale securizate stocate în Kubernetes Secrets.

## Resurse Adiționale

- [Documentație Kubernetes](https://kubernetes.io/docs/)
- [Documentație Statamic CMS](https://statamic.dev/)
- [Documentație Angular](https://angular.io/docs)
- [Documentație Node.js WebSocket](https://github.com/websockets/ws)
- [Documentație Azure Speech Translation](https://docs.microsoft.com/en-us/azure/cognitive-services/speech-service/speech-translation)
