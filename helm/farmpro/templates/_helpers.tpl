{{- define "farmpro.name" -}}
{{- default .Chart.Name .Values.nameOverride -}}
{{- end -}}

{{- define "farmpro.fullname" -}}
{{- printf "%s" (include "farmpro.name" .) -}}
{{- end -}}
