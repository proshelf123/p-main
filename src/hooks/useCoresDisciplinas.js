import { useEffect, useState } from 'react'
import { auth } from '../firebase' // IMPORTANTE: Faltava importar o auth
import { escutarCoresDisciplinas } from '../firebase/estrutura'

export default function useCoresDisciplinas() {
  const [coresDisciplinas, setCoresDisciplinas] = useState({})

  useEffect(() => {
    // É preciso garantir que temos o UID antes de chamar (caso o Firebase ainda esteja carregando)
    const uid = auth.currentUser?.uid;

    if (!uid) {
        // Se ainda não carregou o usuário, não tenta buscar as cores ainda
        return;
    }

    const unsubscribe = escutarCoresDisciplinas(
      uid, 
      (cores) => setCoresDisciplinas(cores), // Correção da sintaxe do callback
      (erro) => {
        console.error('Erro ao escolher cores das disciplinas:', erro)
        setCoresDisciplinas({})
      }
    )

    return () => unsubscribe()
  }, []) // Dependências vazias significa que roda uma vez ao montar o hook

  return coresDisciplinas
}