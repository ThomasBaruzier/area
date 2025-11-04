FROM runmymind/docker-android-sdk:ubuntu-standalone-sha-b954752

ARG UID=1000
ARG GID=1000

ENV GRADLE_USER_HOME=/opt/android-sdk-linux/.gradle

RUN mkdir -p /keystore /output /app/build /opt/android-sdk-linux/.gradle /opt/android-sdk-linux/.android && \
    chown -R ${UID}:${GID} /keystore /output /app /opt/android-sdk-linux/.gradle /opt/android-sdk-linux/.android

USER ${UID}:${GID}

WORKDIR /app

COPY --chown=${UID}:${GID} mobile/gradle ./gradle
COPY --chown=${UID}:${GID} mobile/gradlew ./
COPY --chown=${UID}:${GID} mobile/build.gradle.kts mobile/settings.gradle.kts ./
COPY --chown=${UID}:${GID} mobile/gradle.properties ./
COPY --chown=${UID}:${GID} mobile/app/build.gradle.kts ./app/
COPY --chown=${UID}:${GID} mobile/gradle/libs.versions.toml ./gradle/

RUN chmod +x ./gradlew

RUN ./gradlew app:preBuild --no-daemon --parallel --quiet

COPY --chown=${UID}:${GID} mobile/. .

RUN chmod +x ./build.sh

COPY --chown=${UID}:${GID} docker/mobile/entry.sh /usr/local/bin/entry.sh
RUN chmod +x /usr/local/bin/entry.sh

ENTRYPOINT ["/usr/local/bin/entry.sh"]
