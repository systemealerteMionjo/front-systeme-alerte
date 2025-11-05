import { useState, forwardRef, useEffect } from 'react';
import {
  Button, Dialog, DialogActions, DialogContent,
  DialogContentText, DialogTitle, Grow, IconButton, Tooltip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { supabase } from './supabase';

const API_BASE_URL = "https://fastapi-mionjoapi-alertemionjo1455-9k2qh0ff.leapcell.dev";

// Styles constants
const STYLES = {
  iconButton: {
    color: '#000',
    '&:focus': { outline: 'none' },
    '&.Mui-focusVisible': { outline: 'none' }
  },
  primaryButton: {
    backgroundColor: '#f9aa33',
    color: '#000',
    borderRadius: 2,
    px: 3,
    '&:hover': { backgroundColor: '#e89922' },
    '&:disabled': {
      backgroundColor: '#f9aa3380',
      color: '#00000060'
    }
  },
  secondaryButton: {
    backgroundColor: '#e8f0f6',
    color: '#000',
    borderRadius: 2,
    px: 3,
    '&:hover': { backgroundColor: '#d0e0f0' }
  }
};

// Transition component
const Transition = forwardRef(function Transition(props, ref) {
  return <Grow ref={ref} {...props} />;
});

export default function DeleteDialog({ refreshRows, rowData }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [id, setId] = useState(null);

  useEffect(() => {
    if (open && rowData) {
      setId(rowData.id);
    }
  }, [open, rowData]);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  /**
   * Extrait le chemin du fichier depuis une URL Supabase Storage
   * @param {string} fileUrl - URL complète du fichier
   * @returns {string|null} - Chemin du fichier (ex: "rapport_123_1698765432100.pdf")
   */
  const extractFilePathFromUrl = (fileUrl) => {
    if (!fileUrl) return null;
    
    try {
      console.log('🔗 URL à analyser:', fileUrl);
      
      // Pattern 1: URL Supabase Storage complète
      // Ex: https://abc.supabase.co/storage/v1/object/public/mionjo_files/rapport_123.pdf
      const supabasePattern = /\/storage\/v1\/object\/public\/mionjo_files\/(.+)$/;
      const match = fileUrl.match(supabasePattern);
      
      if (match && match[1]) {
        const filePath = decodeURIComponent(match[1]);
        console.log('📝 Chemin extrait (pattern Supabase):', filePath);
        return filePath;
      }
      
      // Pattern 2: Déjà un nom de fichier simple (sans http, sans /)
      if (!fileUrl.includes('http') && !fileUrl.includes('/')) {
        console.log('📝 C\'est déjà un nom de fichier:', fileUrl);
        return fileUrl;
      }
      
      // Pattern 3: Fallback - extraire le dernier segment après /
      const segments = fileUrl.split('/');
      const fileName = decodeURIComponent(segments[segments.length - 1]);
      
      if (fileName) {
        console.log('📝 Nom de fichier extrait (fallback):', fileName);
        return fileName;
      }
      
      return null;
      
    } catch (error) {
      console.error('❌ Erreur extraction chemin fichier:', error);
      return null;
    }
  };

  /**
   * Vérifie si un fichier existe dans Supabase Storage
   * @param {string} filePath - Chemin du fichier dans le bucket
   * @returns {Promise<{exists: boolean, actualPath: string|null, allFiles: Array}>}
   */
  const checkFileExists = async (filePath) => {
    try {
      console.log('🔍 Vérification existence du fichier...');
      console.log('   Chemin recherché:', filePath);
      
      // Lister TOUS les fichiers du bucket pour comparaison
      const { data: allFiles, error } = await supabase.storage
        .from('mionjo_files')
        .list('', {
          limit: 1000,
        });

      if (error) {
        console.error('❌ Erreur listing fichiers:', error);
        return { exists: false, actualPath: null, allFiles: [] };
      }

      console.log(`📋 Nombre total de fichiers dans le bucket: ${allFiles?.length || 0}`);
      
      if (allFiles && allFiles.length > 0) {
        console.log('📁 Fichiers trouvés:');
        allFiles.forEach((file, index) => {
          const match = file.name === filePath;
          console.log(`   ${index + 1}. "${file.name}" ${match ? '✅ MATCH!' : ''}`);
        });
      }

      // Recherche exacte
      const exactMatch = allFiles?.find(file => file.name === filePath);
      
      if (exactMatch) {
        console.log('✅ Correspondance exacte trouvée!');
        return { exists: true, actualPath: filePath, allFiles };
      }

      // Recherche partielle (cas où il y a un problème d'encodage ou d'espace)
      const partialMatch = allFiles?.find(file => 
        file.name.includes(filePath) || filePath.includes(file.name)
      );

      if (partialMatch) {
        console.log('⚠️ Correspondance partielle trouvée:');
        console.log('   Fichier recherché:', filePath);
        console.log('   Fichier trouvé:', partialMatch.name);
        console.log('   Différence détectée!');
        return { exists: true, actualPath: partialMatch.name, allFiles };
      }

      console.log('❌ Aucune correspondance trouvée');
      return { exists: false, actualPath: null, allFiles };

    } catch (error) {
      console.error('💥 Exception lors de la vérification:', error);
      return { exists: false, actualPath: null, allFiles: [] };
    }
  };

  /**
   * Supprime un fichier du bucket Supabase Storage
   * @param {string} fileUrl - URL du fichier à supprimer
   * @returns {Promise<{success: boolean, exists: boolean, message: string}>}
   */
  const deleteFileFromSupabase = async (fileUrl) => {
    if (!fileUrl) {
      console.log('ℹ️ Aucune URL fournie, rien à supprimer');
      return { success: true, exists: false, message: 'Aucun fichier' };
    }
    
    try {
      console.log(`🗑️ Tentative de suppression du fichier`);
      console.log(`   URL complète: ${fileUrl}`);

      // Extraire le chemin du fichier
      const filePath = extractFilePathFromUrl(fileUrl);
      
      if (!filePath) {
        console.error('❌ Impossible d\'extraire le chemin du fichier');
        console.error('   URL problématique:', fileUrl);
        return { 
          success: false, 
          exists: false, 
          message: 'Chemin invalide' 
        };
      }

      console.log(`🔍 Chemin extrait: "${filePath}"`);
      console.log(`   Longueur: ${filePath.length} caractères`);
      console.log(`   Caractères (codes): ${Array.from(filePath).map(c => `${c}(${c.charCodeAt(0)})`).join(' ')}`);

      // Vérifier si le fichier existe et obtenir le chemin réel
      const fileCheck = await checkFileExists(filePath);
      console.log(`📋 Résultat vérification:`);
      console.log(`   - Existe: ${fileCheck.exists}`);
      console.log(`   - Chemin réel: ${fileCheck.actualPath}`);
      console.log(`   - Nombre de fichiers dans bucket: ${fileCheck.allFiles.length}`);

      if (!fileCheck.exists) {
        console.log('ℹ️ Fichier inexistant, rien à supprimer');
        return { 
          success: true, 
          exists: false, 
          message: 'Fichier déjà supprimé ou inexistant' 
        };
      }

      // Utiliser le chemin réel trouvé (important si différent!)
      const actualPathToDelete = fileCheck.actualPath || filePath;
      
      if (actualPathToDelete !== filePath) {
        console.log('⚠️ ATTENTION: Chemin corrigé!');
        console.log(`   Chemin initial: "${filePath}"`);
        console.log(`   Chemin réel: "${actualPathToDelete}"`);
      }

      // Supprimer le fichier du bucket Supabase
      console.log(`🗑️ Suppression du fichier: "${actualPathToDelete}"`);
      const { data, error } = await supabase.storage
        .from('mionjo_files')
        .remove([actualPathToDelete]);

      if (error) {
        console.error('❌ Erreur Supabase lors de la suppression:');
        console.error('   Message:', error.message);
        console.error('   Status:', error.statusCode);
        console.error('   Nom:', error.name);
        console.error('   Erreur complète:', JSON.stringify(error, null, 2));
        
        // Cas où le fichier n'existe pas (pas une erreur bloquante)
        const notFoundErrors = [
          'not found',
          'does not exist',
          'object not found',
          'resource you requested could not be found',
          'file not found',
          'inexistant'
        ];
        
        const isNotFound = notFoundErrors.some(msg => 
          error.message?.toLowerCase().includes(msg.toLowerCase())
        );
        
        if (isNotFound) {
          console.log('ℹ️ Fichier introuvable dans Supabase');
          return { 
            success: true, 
            exists: false, 
            message: 'Fichier introuvable' 
          };
        }
        
        return { 
          success: false, 
          exists: true, 
          message: error.message 
        };
      }

      // ⚠️ IMPORTANT: data est un tableau des fichiers supprimés
      // Si le tableau est vide, le fichier n'existait pas
      console.log('📦 Réponse Supabase:', data);
      console.log('   Type:', Array.isArray(data) ? 'Array' : typeof data);
      console.log('   Longueur:', data?.length);
      
      if (!data || (Array.isArray(data) && data.length === 0)) {
        console.log('⚠️ Aucun fichier supprimé (tableau vide)');
        console.log('   Le fichier n\'existe probablement pas dans Supabase Storage');
        return { 
          success: true, 
          exists: false, 
          message: 'Fichier inexistant dans le storage' 
        };
      }

      console.log(`✅ Fichier(s) supprimé(s) avec succès:`, data);
      return { 
        success: true, 
        exists: true, 
        message: 'Suppression réussie' 
      };

    } catch (error) {
      console.error('💥 Exception lors de la suppression:');
      console.error('   Message:', error.message);
      console.error('   Stack:', error.stack);
      return { 
        success: false, 
        exists: false, 
        message: error.message 
      };
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!id) {
      toast.error("ID invalide");
      return;
    }

    setLoading(true);

    try {
      console.log('═══════════════════════════════════════');
      console.log(`🚀 DÉBUT SUPPRESSION - ID: ${id}`);
      console.log('═══════════════════════════════════════');
      console.log('📋 Données:', JSON.stringify(rowData, null, 2));

      let fileResult = { success: true, exists: false, message: 'Aucun fichier' };

      // ÉTAPE 1: Supprimer le fichier Supabase si présent
      if (rowData?.fichierUrl) {
        console.log('\n📎 ÉTAPE 1: Suppression du fichier...');
        console.log('   URL stockée:', rowData.fichierUrl);
        
        fileResult = await deleteFileFromSupabase(rowData.fichierUrl);
        
        console.log(`📊 Résultat suppression fichier:`);
        console.log(`   - Succès: ${fileResult.success}`);
        console.log(`   - Existait: ${fileResult.exists}`);
        console.log(`   - Message: ${fileResult.message}`);
      } else {
        console.log('\nℹ️ ÉTAPE 1: Aucun fichier à supprimer');
      }

      // ÉTAPE 2: Supprimer l'enregistrement en base de données
      console.log('\n🗃️ ÉTAPE 2: Suppression en base de données...');
      const response = await axios.get(
        `${API_BASE_URL}/supprimer_information/${id}`
      );
      
      console.log('✅ Réponse API:', response.data);

      // Message de succès approprié
      if (rowData?.fichierUrl) {
        if (fileResult.success && fileResult.exists) {
          toast.success("✅ Suppression complète réussie");
        } else if (fileResult.success && !fileResult.exists) {
          toast.success("✅ DB supprimée (ℹ️ fichier déjà absent)");
        } else {
          toast.success("✅ DB supprimée (⚠️ échec suppression fichier)", {
            duration: 5000
          });
        }
      } else {
        toast.success("✅ Suppression réussie");
      }

      console.log('\n═══════════════════════════════════════');
      console.log('✅ SUPPRESSION TERMINÉE AVEC SUCCÈS');
      console.log('═══════════════════════════════════════\n');

      handleClose();

      // Rafraîchir les données
      if (refreshRows) {
        console.log('🔄 Rafraîchissement des données...');
        await refreshRows();
      }

    } catch (error) {
      console.error('\n═══════════════════════════════════════');
      console.error('❌ ERREUR LORS DE LA SUPPRESSION');
      console.error('═══════════════════════════════════════');
      console.error('Type:', error.name);
      console.error('Message:', error.message);
      console.error('Réponse API:', error.response?.data);
      console.error('Status:', error.response?.status);
      console.error('Stack:', error.stack);
      console.error('═══════════════════════════════════════\n');
      
      const errorMsg = 
        error.response?.data?.detail || 
        error.response?.data?.error || 
        error.message ||
        "Erreur lors de la suppression";
      
      toast.error(`❌ ${errorMsg}`, {
        duration: 5000
      });
    } finally {
      setLoading(false);
    }
  };

  // Afficher le nom du fichier dans la dialog
  const getDisplayFileName = () => {
    if (!rowData?.fichierUrl) return null;
    const path = extractFilePathFromUrl(rowData.fichierUrl);
    return path || 'Fichier inconnu';
  };

  return (
    <>
      <Tooltip title="Supprimer">
        <IconButton
          size="small"
          onClick={handleClickOpen}
          sx={STYLES.iconButton}
          aria-label="Supprimer l'activité"
        >
          <DeleteIcon />
        </IconButton>
      </Tooltip>

      <Dialog
        open={open}
        onClose={handleClose}
        TransitionComponent={Transition}
        fullWidth
        maxWidth="sm"
        keepMounted={false}
        TransitionProps={{
          timeout: 300
        }}
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          Supprimer cette ligne N° {rowData?.id}
        </DialogTitle>

        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            <strong>Activité:</strong> {rowData?.raison || 'Non spécifiée'}
          </DialogContentText>
          
          <DialogContentText 
            variant="body2" 
            color="warning.main" 
            sx={{ mt: 2, fontWeight: 500 }}
          >
            ⚠️ <strong>Attention:</strong> Cette action est irréversible et supprimera:
          </DialogContentText>
        
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button
            onClick={handleClose}
            disabled={loading}
            sx={STYLES.secondaryButton}
          >
            Annuler
          </Button>
          
          <Button
            onClick={handleSubmit}
            disabled={loading}
            sx={STYLES.primaryButton}
          >
            {loading ? "Suppression..." : "Confirmer"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}