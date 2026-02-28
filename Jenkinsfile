pipeline {
  agent any
  environment {
    IMAGE = "regobert2004/farmpro:latest"
  }
  stages {
    stage('Checkout') {
      steps { checkout scm }
    }
    stage('Build') {
      steps {
        sh 'docker build -t ${IMAGE} -f Dockerfile .'
      }
    }
    stage('Push') {
      steps {
        withCredentials([usernamePassword(credentialsId: 'dockerhub', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
          sh 'echo $DOCKER_PASS | docker login -u $DOCKER_USER --password-stdin'
          sh 'docker push ${IMAGE}'
        }
      }
    }
    stage('Deploy to Kubernetes') {
      steps {
        // Assumes kubeconfig is available on Jenkins agent
        sh 'kubectl apply -f k8s/'
      }
    }
  }
}
