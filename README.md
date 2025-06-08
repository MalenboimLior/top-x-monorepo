# top-x-monorepo

cd packages/shared
sudo npm install
npm run build
sudo npm link
cd ../apps/admin
sudo npm link @top-x/shared
cd ../client
sudo npm link @top-x/shared