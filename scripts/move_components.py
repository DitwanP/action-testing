#!/usr/bin/env python3
import os, shutil, glob
root='packages/src/components'
files=sorted(glob.glob(os.path.join(root,'*.tsx')))
print('Found',len(files),'top-level .tsx files to move')
for f in files:
    name=os.path.splitext(os.path.basename(f))[0]
    destdir=os.path.join(root,name)
    os.makedirs(destdir,exist_ok=True)
    dest=os.path.join(destdir,os.path.basename(f))
    try:
        shutil.move(f,dest)
        print('Moved',os.path.relpath(f), '->', os.path.relpath(dest))
    except Exception as e:
        print('Error moving',f,':',e)
# verification
remaining=sorted(glob.glob(os.path.join(root,'*.tsx')))
print('\nRemaining top-level .tsx files:',len(remaining))
for r in remaining:
    print('-',os.path.relpath(r))
moved=sorted(glob.glob(os.path.join(root,'*','*.tsx')))
print('\nTotal component files now in folders:',len(moved))
for p in moved[:1000]:
    print('-',os.path.relpath(p))
