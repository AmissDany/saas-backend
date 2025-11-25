FROM node:18

# Crear directorio de la app
WORKDIR /app

# Copiar package.json
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar todo el código
COPY . .

# Exponer el puerto que usa tu backend
#EXPOSE 8080

# Comando de inicio
CMD ["npm", "start"]
