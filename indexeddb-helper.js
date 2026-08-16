// ============================================
// FINORA — IndexedDB Helper
// ============================================

class IndexedDBHelper {
    constructor(dbName, version, stores) {
        this.dbName = dbName;
        this.version = version;
        this.stores = stores;
        this.db = null;
    }

    open() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                this.stores.forEach(storeConfig => {
                    if (!db.objectStoreNames.contains(storeConfig.name)) {
                        const store = db.createObjectStore(storeConfig.name, {
                            keyPath: storeConfig.keyPath || 'id',
                            autoIncrement: storeConfig.autoIncrement || false
                        });
                        if (storeConfig.indexes) {
                            storeConfig.indexes.forEach(idx => {
                                store.createIndex(idx.name, idx.keyPath, {
                                    unique: idx.unique || false,
                                    multiEntry: idx.multiEntry || false
                                });
                            });
                        }
                    }
                });
            };
        });
    }

    async ensureOpen() {
        if (!this.db) {
            await this.open();
        }
        return this.db;
    }

    // ----- CRUD OPERATIONS -----

    async create(storeName, data) {
        const db = await this.ensureOpen();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const request = store.add(data);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async read(storeName, id) {
        const db = await this.ensureOpen();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async readAll(storeName) {
        const db = await this.ensureOpen();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async update(storeName, data) {
        const db = await this.ensureOpen();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const request = store.put(data);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async delete(storeName, id) {
        const db = await this.ensureOpen();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // ----- QUERY -----

    async getByIndex(storeName, indexName, value) {
        const db = await this.ensureOpen();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(value);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getByIndexRange(storeName, indexName, lower, upper) {
        const db = await this.ensureOpen();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const index = store.index(indexName);
            const range = IDBKeyRange.bound(lower, upper);
            const request = index.getAll(range);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async count(storeName) {
        const db = await this.ensureOpen();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const request = store.count();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // ----- BULK -----

    async bulkCreate(storeName, dataArray) {
        const db = await this.ensureOpen();
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const promises = dataArray.map(data => {
            return new Promise((resolve, reject) => {
                const req = store.add(data);
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
        });
        return Promise.all(promises);
    }

    // ----- CLEAR -----

    async clearStore(storeName) {
        const db = await this.ensureOpen();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // ----- EXPORT / BACKUP -----

    async exportAll() {
        const db = await this.ensureOpen();
        const data = {};
        const storeNames = this.stores.map(s => s.name);
        for (const name of storeNames) {
            data[name] = await this.readAll(name);
        }
        return data;
    }

    async importAll(data) {
        const db = await this.ensureOpen();
        const storeNames = this.stores.map(s => s.name);
        for (const name of storeNames) {
            if (data[name]) {
                await this.clearStore(name);
                if (data[name].length > 0) {
                    await this.bulkCreate(name, data[name]);
                }
            }
        }
        return true;
    }
}
