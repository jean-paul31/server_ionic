# MonAppAngular

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 17.1.1.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.

## Multilingual video playback

The player uses the browser's native video element. Flask uses FFmpeg to transcode the selected audio track to browser-compatible MP4 while sending the video directly to the browser; it does not write converted video or segment files to disk. Changing the audio track restarts playback from the beginning. Text subtitle tracks (SRT, ASS/SSA, WebVTT, and mov_text) are converted to WebVTT on demand. Image subtitles such as PGS are not supported.

Install FFmpeg and FFprobe on the machine running Flask and make both executables available in `PATH`. On Windows, verify the installation with `ffmpeg -version` and `ffprobe -version`. If needed, set the `FFMPEG_BINARY` and `FFPROBE_BINARY` environment variables to their executable paths before starting Flask. The FFmpeg build must include `libx264`.
