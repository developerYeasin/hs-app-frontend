"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { PlusCircle, Edit, Eye, Trash2 } from "lucide-react";
import AddButtonModal from "@/components/admin/buttons/AddButtonModal";
import EditButtonModal from "@/components/admin/buttons/EditButtonModal";
import ViewButtonModal from "@/components/admin/buttons/ViewButtonModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const fetchButtons = async () => {
  const { data, error } = await supabase
    .from("buttons")
    .select("*, cards(title)") // Select buttons and join with cards table
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
};

const ManageButtons = () => {
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedButton, setSelectedButton] = useState(null);
  const [buttonToDelete, setButtonToDelete] = useState(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false); // State for delete dialog

  const {
    data: buttons,
    isLoading: isLoadingButtons,
    isError: isErrorButtons,
    error: buttonsError,
  } = useQuery({
    queryKey: ["adminButtonsList"],
    queryFn: fetchButtons,
  });

  useEffect(() => {
    if (isErrorButtons) {
      showError("Failed to load buttons: " + buttonsError.message);
    }
  }, [isErrorButtons, buttonsError]);

  const handleDeleteButton = async () => {
    if (!buttonToDelete) return;

    const { error } = await supabase
      .from("buttons")
      .delete()
      .eq("id", buttonToDelete);

    if (error) {
      showError("Failed to delete button: " + error.message);
    } else {
      showSuccess("Button deleted successfully!");
      queryClient.invalidateQueries(["adminButtonsList"]);
    }
    setButtonToDelete(null); // Clear the button to delete
    setIsDeleteDialogOpen(false); // Close the dialog
  };

  const openEditModal = (button) => {
    setSelectedButton(button);
    setIsEditModalOpen(true);
  };

  const openViewModal = (button) => {
    setSelectedButton(button);
    setIsViewModalOpen(true);
  };

  return (
    <div className="space-y-8">
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle className="text-2xl">Manage Buttons</CardTitle>
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="py-2.5 px-4 flex items-center"
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Button
          </Button>
        </CardHeader>
        <CardContent>
          {isLoadingButtons ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : isErrorButtons ? (
            <div className="text-center text-red-500">
              <p>Error loading buttons: {buttonsError?.message}</p>
            </div>
          ) : buttons?.length === 0 ? (
            <div className="text-center text-muted-foreground">
              No buttons added yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Card Title</TableHead>
                  <TableHead>Button Text</TableHead>
                  <TableHead>API Method</TableHead>
                  <TableHead>API URL</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {buttons?.map((button) => (
                  <TableRow key={button.id}>
                    <TableCell className="font-medium text-xs">
                      {button.id}
                    </TableCell>
                    <TableCell>{button.cards?.title || "N/A"}</TableCell>
                    <TableCell>{button.button_text}</TableCell>
                    <TableCell className="uppercase">{button.api_method}</TableCell>
                    <TableCell className="text-xs truncate max-w-[150px]">
                      {button.api_url}
                    </TableCell>
                    <TableCell>
                      {new Date(button.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => openViewModal(button)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => openEditModal(button)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => {
                            setButtonToDelete(button.id);
                            setIsDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Global AlertDialog for delete confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg md:w-full">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Are you absolutely sure?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will
              permanently delete this button.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex justify-end space-x-2"> {/* Added styling here */}
            <AlertDialogCancel
              onClick={() => {
                setButtonToDelete(null);
                setIsDeleteDialogOpen(false);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteButton}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AddButtonModal
        isOpen={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
      />
      {selectedButton && (
        <EditButtonModal
          isOpen={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          button={selectedButton}
        />
      )}
      {selectedButton && (
        <ViewButtonModal
          isOpen={isViewModalOpen}
          onOpenChange={setIsViewModalOpen}
          button={selectedButton}
        />
      )}
    </div>
  );
};

export default ManageButtons;