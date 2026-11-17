// Persistenz: ein JSON-Dokument pro Raum in DATA_DIR/rooms (atomar geschrieben)
import fs from 'node:fs';
import path from 'node:path';

const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30; // Räume nach 30 Tagen ohne Änderung löschen

export class Store {
  constructor(dir) {
    this.dir = path.join(dir, 'rooms');
    fs.mkdirSync(this.dir, { recursive: true });
    this.rooms = new Map();
    this.timers = new Map();
    this.load();
  }

  load() {
    for (const f of fs.readdirSync(this.dir)) {
      if (!f.endsWith('.json')) continue;
      try {
        const room = JSON.parse(fs.readFileSync(path.join(this.dir, f), 'utf8'));
        if (Date.now() - (room.updatedAt || 0) > MAX_AGE_MS) { fs.rmSync(path.join(this.dir, f), { force: true }); continue; }
        for (const p of Object.values(room.players || {})) p.online = false;
        this.rooms.set(room.code, room);
      } catch (e) { console.error('Raum konnte nicht geladen werden:', f, e.message); }
    }
    console.log(`${this.rooms.size} Raum/Räume geladen aus ${this.dir}`);
  }

  get(code) { return this.rooms.get(String(code || '').toUpperCase()); }
  has(code) { return this.rooms.has(code); }
  add(room) { this.rooms.set(room.code, room); this.saveNow(room); }

  touch(room) {
    room.updatedAt = Date.now();
    if (this.timers.has(room.code)) return;
    this.timers.set(room.code, setTimeout(() => { this.timers.delete(room.code); this.saveNow(room); }, 1500));
  }

  saveNow(room) {
    const file = path.join(this.dir, `${room.code}.json`);
    const tmp = `${file}.tmp`;
    try {
      const { online, ...rest } = room;
      fs.writeFileSync(tmp, JSON.stringify(rest));
      fs.renameSync(tmp, file);
    } catch (e) { console.error('Speichern fehlgeschlagen:', room.code, e.message); }
  }

  remove(code) {
    this.rooms.delete(code);
    clearTimeout(this.timers.get(code)); this.timers.delete(code);
    fs.rmSync(path.join(this.dir, `${code}.json`), { force: true });
  }

  flushAll() {
    for (const [code, t] of this.timers) { clearTimeout(t); const r = this.rooms.get(code); if (r) this.saveNow(r); }
    this.timers.clear();
  }

  sweep() {
    for (const r of this.rooms.values()) if (Date.now() - r.updatedAt > MAX_AGE_MS) this.remove(r.code);
  }
}
