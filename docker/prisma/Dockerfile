FROM alpine:3.22

RUN apk add --no-cache nodejs npm shadow

WORKDIR /app

ARG UID=1000
ARG GID=1000

RUN groupadd -g $GID prisma && \
    useradd -m -u $UID -g $GID -s /bin/sh prisma && \
    chown -R prisma:prisma /app

USER prisma

EXPOSE 5555

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://localhost:5555 || exit 1

CMD ["npx", "prisma", "studio", "--hostname", "0.0.0.0", "--port", "5555"]
