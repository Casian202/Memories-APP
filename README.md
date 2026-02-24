# 💕 Memories for Two

O aplicație web modernă pentru cupluri, creată pentru a păstra și împărtăși amintiri comune.

![Docker](https://img.shields.io/badge/Docker-Ready-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green)
![React](https://img.shields.io/badge/React-18+-blue)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4+-38bdf8)

## ✨ Funcționalități

### 🗓️ Evenimente & Amintiri
- Creare și gestionare evenimente (întâlniri, vacanțe, aniversări, zile de naștere)
- Upload poze cu compresie automată
- Galerie foto cu slideshow
- Generare colaje

### 🎁 Surprize
- Trimite surprize partenerului
- Condiții de revelare: dată calendaristică sau număr de click-uri
- Card-uri mystery cu animații

### 💝 Motivații Zilnice
- Trimite mesaje de încurajare și iubire
- Notificări pentru mesaje noi
- Istoricul motivațiilor primite

### 🎨 Sistem de Teme
- 9 teme predefinite (Default, Slytherin, Gryffindor, Valentine, Christmas, New Year, Vacation Ski, Vacation Beach, Anniversary)
- Activare automată pe baza datelor speciale
- Customizare culori și fonturi

### 🔐 Securitate
- Autentificare JWT cu refresh tokens
- Schimbare parolă obligatorie la prima autentificare
- Hash parole cu bcrypt
- Validare input cu Pydantic

## 🚀 Instalare Rapidă

### Cerințe
- Docker și Docker Compose
- Ubuntu 24.04 (recomandat)

### Pași

1. **Clonează repository-ul**
```bash
git clone <repository-url>
cd Memories-APP
```

2. **Creează fișierul .env**
```bash
cp .env.example .env
# Editează .env cu valorile tale
```

3. **Pornește aplicația**
```bash
docker-compose up -d
```

4. **Accesează aplicația**
- Local: http://localhost:8184
- Via Cloudflare Tunnel: configurează `deploy/cloudflared/config.yml`

### Credențiale Inițiale

| Utilizator | Parolă | Rol |
|------------|--------|-----|
| `hubby` | `memories2024` | Admin |
| `wifey` | `memories2024` | User |

⚠️ **Schimbă parolele la prima autentificare!**

## 📁 Structura Proiectului

```
memories-app/
├── docker-compose.yml      # Configurație Docker
├── .env.example            # Variabile de mediu exemplu
├── README.md               # Documentație
├── deploy/
│   ├── Dockerfile.backend  # Imagine backend
│   ├── Dockerfile.frontend # Imagine frontend
│   ├── nginx.conf          # Configurare Nginx
│   └── cloudflared/        # Configurare Cloudflare Tunnel
├── backend/
│   ├── app/
│   │   ├── main.py         # Entry point FastAPI
│   │   ├── config.py       # Configurare
│   │   ├── database.py     # Conexiune SQLite
│   │   ├── models/         # Modele SQLAlchemy
│   │   ├── schemas/        # Schemă Pydantic
│   │   ├── routers/        # Endpoint-uri API
│   │   ├── services/       # Logică business
│   │   ├── utils/          # Utilități
│   │   └── seeds/          # Date inițiale
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── components/     # Componente React
│   │   ├── pages/          # Pagini
│   │   ├── context/        # React Context
│   │   ├── services/       # Servicii API
│   │   └── utils/          # Utilități
│   ├── package.json
│   └── vite.config.js
└── data/
    ├── sqlite/             # Baza de date
    ├── photos/             # Poze încărcate
    ├── backups/            # Backup-uri
    └── logs/               # Log-uri
```

## 🔧 Configurare

### Variabile de Mediu

| Variabilă | Descriere | Default |
|-----------|-----------|---------|
| `SECRET_KEY` | Cheia secretă pentru JWT | - |
| `DATABASE_URL` | URL baza de date | `sqlite+aiosqlite:///./data/sqlite/memories.db` |
| `UPLOAD_DIR` | Director upload fișiere | `./data/photos` |
| `MAX_UPLOAD_SIZE` | Dimensiune maximă upload (bytes) | `52428800` (50MB) |
| `CORS_ORIGINS` | Origini CORS | `*` |

### Cloudflare Tunnel

1. Creează un tunel în dashboard-ul Cloudflare
2. Copiază token-ul în `deploy/cloudflared/config.yml`
3. Restart container: `docker-compose restart cloudflared`

## 📱 Interfață Mobile-First

- Design responsive pentru toate dimensiunile de ecran
- Navigare adaptivă (hamburger pe mobil, sidebar pe desktop)
- Touch-friendly cu butoane minimum 44x44px
- Animații subtile pentru experiență fluidă

## 🔌 API Endpoints

### Autentificare
- `POST /api/auth/login` - Autentificare
- `POST /api/auth/logout` - Deconectare
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/change-password` - Schimbare parolă
- `GET /api/auth/me` - Info utilizator curent

### Evenimente
- `GET /api/events` - Lista evenimente
- `GET /api/events/upcoming` - Evenimente viitoare
- `GET /api/events/{id}` - Detalii eveniment
- `POST /api/events` - Creare eveniment (admin)
- `PUT /api/events/{id}` - Actualizare eveniment
- `DELETE /api/events/{id}` - Ștergere eveniment

### Poze
- `POST /api/events/{id}/photos` - Upload poze
- `GET /api/events/{id}/photos` - Lista poze
- `DELETE /api/photos/{id}` - Ștergere poză

### Surprize
- `GET /api/surprises/received` - Surprize primite
- `GET /api/surprises/sent` - Surprize trimise
- `POST /api/surprises` - Creare surpriză
- `POST /api/surprises/{id}/click` - Înregistrare click

### Motivații
- `GET /api/motivations/received` - Motivații primite
- `POST /api/motivations` - Trimite motivație

### Teme
- `GET /api/themes` - Lista teme
- `GET /api/themes/active` - Tema activă
- `POST /api/themes/{id}/activate` - Activare temă (admin)

### Admin
- `GET /api/admin/users` - Lista utilizatori
- `GET /api/admin/stats` - Statistici

## 🛠️ Dezvoltare

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Backup
```bash
# Backup manual
docker-compose exec backend python -m app.services.backup_service

# Backup automat (cron)
# Adaugă în crontab: 0 3 * * * docker-compose exec -T backend python -m app.services.backup_service
```

## 📊 Baza de Date

Aplicația folosește SQLite cu WAL mode pentru concurență. Tabele principale:

- `users` - Utilizatori (maxim 2)
- `relationship` - Detalii relație
- `themes` - Teme vizuale
- `events` - Evenimente
- `photos` - Poze
- `surprises` - Surprize
- `motivations` - Motivații zilnice
- `daily_messages` - Mesajul zilei
- `sessions` - Sesiuni autentificare

## 🔒 Securitate

- Parole hash-uite cu bcrypt
- JWT cu expirare (7 zile)
- Refresh tokens
- CORS configurabil
- Validare input
- Sanitizare nume fișiere
- Verificare tip fișier (MIME)
- Limitare dimensiune upload
- HTTPS prin Cloudflare Tunnel

## 📄 Licență

Acest proiect este pentru uz personal.

---

Made with ❤️ for couples