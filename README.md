# ImportacionesJuank PIM

Centro de productos: Excel / alta individual → catálogo → Shopify (con precios por cantidad).

## Arranque local

```bash
cp .env.example .env.local
npm install
npm run dev
```

## ¿Netlify u otra cosa?

**Netlify está bien** para este PIM (Next.js + API routes). Úsalo si ya tienes cuenta ahí o te resulta cómodo.

**Alternativa:** [Vercel](https://vercel.com) suele ir un poco más natural con Next.js (mismo ecosistema), mismos env vars.

En ambos, ojo: un sync de **muchos** productos puede acercarse al timeout de las funciones serverless (~10–26 s). Si importas catálogos enormes de golpe, sube por familias o considera un plan con más tiempo.

La **Discount Function** de Shopify **no** se despliega en Netlify: sigue con `npm run shopify:deploy`.

## Desplegar en Netlify

1. Sube el repo a GitHub/GitLab (sin `.env.local`).
2. [app.netlify.com](https://app.netlify.com) → **Add new site** → Import from Git.
3. Build settings (ya vienen en `netlify.toml`):
   - Build command: `npm run build`
   - Publish: `.next` (lo maneja el plugin Next.js)
4. **Site configuration → Environment variables** — copia estas desde `.env.local`:

| Variable | Notas |
|----------|--------|
| `SHOPIFY_STORE_DOMAIN` | `tu-tienda.myshopify.com` |
| `SHOPIFY_CLIENT_ID` | App Dev Dashboard |
| `SHOPIFY_CLIENT_SECRET` | Secreto |
| `NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN` | Igual que el store domain |
| `NEXT_PUBLIC_SUPABASE_URL` | Opcional por ahora |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Opcional |
| `SUPABASE_SERVICE_ROLE_KEY` | Solo si usas Supabase admin |

5. Deploy. La URL será tipo `https://algo.netlify.app`.
6. (Opcional) Dominio custom en Netlify → Domain management.

No hace falta cambiar la app de Shopify por la URL del PIM: el PIM habla a Shopify con client credentials; no es una app embebida.

## Flujo de uso

| Ruta | Uso |
|------|-----|
| `/` | Importar Excel |
| `/nuevo` | Alta individual |
| `/catalogo` | Catálogo Shopify |
| `/precios` | Precios por cantidad |

## Precios por cantidad (Shopify Function)

1. Scopes `write_discounts` / `read_discounts` + reinstalar app.
2. `npx shopify app deploy`
3. En `/precios` → Activar descuento.

## Estructura

```
src/          # Next.js PIM
extensions/   # Shopify Function (deploy aparte)
theme/        # Snippet Liquid opcional
netlify.toml  # Config de deploy
```
