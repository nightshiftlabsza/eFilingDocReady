@echo off
cd /d D:\Apps\DocReady
npx vercel --prod --yes --name efiling-docready 2>&1
echo DEPLOY_DONE
