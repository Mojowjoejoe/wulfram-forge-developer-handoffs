/** Preserve exact stored bytes before an explicitly requested reset. Never reset a changed source. */
export function backupAndResetLibrary(storage:Pick<Storage,'getItem'|'setItem'>,key:string,expectedRaw:string,backupId:string,resetRaw:string='[]'):string {
 if(storage.getItem(key)!==expectedRaw)throw new Error('Stored library changed. Reopen this panel before recovering it.');
 const backupKey=`${key}-recovery-${backupId}`;
 if(storage.getItem(backupKey)!==null)throw new Error('Recovery backup already exists. Try again.');
 storage.setItem(backupKey,expectedRaw);
 if(storage.getItem(backupKey)!==expectedRaw)throw new Error('Recovery backup could not be verified. Original library retained.');
 if(storage.getItem(key)!==expectedRaw)throw new Error('Stored library changed during backup. It was not reset.');
 storage.setItem(`${key}-latest-recovery`,backupKey);
 if(storage.getItem(`${key}-latest-recovery`)!==backupKey)throw new Error('Recovery reference could not be verified. Original library retained.');
 if(storage.getItem(key)!==expectedRaw)throw new Error('Stored library changed during recovery reference update. It was not reset.');
 storage.setItem(key,resetRaw);
 if(storage.getItem(key)!==resetRaw)throw new Error('Library reset could not be verified. Recovery backup retained.');
 return backupKey;
}

export function latestLibraryBackup(storage:Pick<Storage,'getItem'>,key:string):string|undefined {
 const backup=storage.getItem(`${key}-latest-recovery`);
 return backup?.startsWith(`${key}-recovery-`)&&storage.getItem(backup)!==null?backup:undefined;
}
