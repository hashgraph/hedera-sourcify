{{/*
Expand the name of the chart. This chart is suffixed with -repository which means subtract 11 from 63 available characters.
*/}}
{{- define "sourcify.repository.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 52 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.  The longest name adds 11 characters.
*/}}
{{- define "sourcify.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 52 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "sourcify.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "sourcify.labels" -}}
helm.sh/chart: {{ include "sourcify.chart" . }}
{{ include "sourcify.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "sourcify.selectorLabels" -}}
app.kubernetes.io/name: {{ include "sourcify.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Selector labels for the repository deployment.
*/}}
{{- define "sourcify.repository.selectorLabels" -}}
app.kubernetes.io/name: {{ include "sourcify.name" . }}-repository
app: {{ .Chart.Name }}-repository
{{- end }}

{{/*
Selector labels for the server deployment.
*/}}
{{- define "sourcify.server.selectorLabels" -}}
app.kubernetes.io/name: {{ include "sourcify.name" . }}-server
app: {{ .Chart.Name }}-server
{{- end }}

{{/*
Selector labels for the monitor deployment.
*/}}
{{- define "sourcify.monitor.selectorLabels" -}}
app.kubernetes.io/name: {{ include "sourcify.name" . }}-monitor
app: {{ .Chart.Name }}-monitor
{{- end }}

{{/*
Create the sourcify-repository name of the service account to use
*/}}
{{- define "sourcify.repository.serviceAccountName" -}}
{{- if .Values.repository.serviceAccount.create }}
{{- default (include "sourcify.fullname" .) .Values.repository.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.repository.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Create the souricfy-server name of the service account to use
*/}}
{{- define "sourcify.server.serviceAccountName" -}}
{{- if .Values.server.serviceAccount.create }}
{{- default (include "sourcify.fullname" .) .Values.server.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.server.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Create the sourcify-monitor name of the service account to use
*/}}
{{- define "sourcify.monitor.serviceAccountName" -}}
{{- if .Values.monitor.serviceAccount.create }}
{{- default (include "sourcify.fullname" .) .Values.monitor.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.monitor.serviceAccount.name }}
{{- end }}
{{- end }}
