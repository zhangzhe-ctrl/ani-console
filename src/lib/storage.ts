import localforage from "localforage";

export const authStorage = localforage.createInstance({
  name: "ani-console",
  storeName: "auth",
});

export const preferenceStorage = localforage.createInstance({
  name: "ani-console",
  storeName: "preferences",
});
